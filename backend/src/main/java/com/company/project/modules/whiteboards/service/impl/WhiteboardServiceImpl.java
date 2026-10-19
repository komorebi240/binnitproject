package com.company.project.modules.whiteboards.service.impl;

import com.company.project.common.NotificationType;
import com.company.project.common.exception.BusinessException;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.notifications.service.NotificationService;
import com.company.project.modules.whiteboards.domain.WhiteboardAccess;
import com.company.project.modules.whiteboards.domain.WhiteboardEntity;
import com.company.project.modules.whiteboards.domain.WhiteboardMemberEntity;
import com.company.project.modules.whiteboards.domain.WhiteboardRole;
import com.company.project.modules.whiteboards.dto.request.CreateWhiteboardRequest;
import com.company.project.modules.whiteboards.dto.request.RenameWhiteboardRequest;
import com.company.project.modules.whiteboards.dto.request.SaveWhiteboardSceneRequest;
import com.company.project.modules.whiteboards.dto.request.SetWhiteboardMemberRequest;
import com.company.project.modules.whiteboards.dto.response.WhiteboardDetailResponse;
import com.company.project.modules.whiteboards.dto.response.WhiteboardMemberResponse;
import com.company.project.modules.whiteboards.dto.response.WhiteboardSummaryResponse;
import com.company.project.modules.whiteboards.dto.response.WhiteboardVersionResponse;
import com.company.project.modules.whiteboards.repository.WhiteboardMemberRepository;
import com.company.project.modules.whiteboards.repository.WhiteboardRepository;
import com.company.project.modules.whiteboards.repository.WhiteboardSummaryView;
import com.company.project.modules.whiteboards.service.WhiteboardScenes;
import com.company.project.modules.whiteboards.service.WhiteboardService;
import com.company.project.security.UserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Authorization summary (CLAUDE.md section 9): the caller's relation to a board comes only from the board's owner and its
 * member rows, never from anything the client sends. A board of another company, a deleted board, or one the caller was
 * not shared is "not found". Viewers read; editors also draw; only the owner renames, deletes and decides who has access.
 */
@Service
public class WhiteboardServiceImpl implements WhiteboardService {

    static final int MAX_OWNED_BOARDS = 100;
    static final int MAX_MEMBERS = 50;

    private static final Logger log = LoggerFactory.getLogger(WhiteboardServiceImpl.class);
    private static final String RESOURCE = "Whiteboard";

    private final WhiteboardRepository whiteboardRepository;
    private final WhiteboardMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final WhiteboardScenes scenes;

    public WhiteboardServiceImpl(
            WhiteboardRepository whiteboardRepository,
            WhiteboardMemberRepository memberRepository,
            UserRepository userRepository,
            NotificationService notificationService,
            WhiteboardScenes scenes
    ) {
        this.whiteboardRepository = whiteboardRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.scenes = scenes;
    }

    @Override
    @Transactional(readOnly = true)
    public List<WhiteboardSummaryResponse> listBoards(UserPrincipal caller) {
        List<WhiteboardSummaryView> rows = whiteboardRepository.findVisibleTo(caller.getCompanyId(), caller.getUserId());
        if (rows.isEmpty()) {
            return List.of();
        }
        List<Long> sharedIds = rows.stream()
                .filter(row -> !row.ownerId().equals(caller.getUserId()))
                .map(WhiteboardSummaryView::id)
                .toList();
        Map<Long, WhiteboardRole> roles = sharedIds.isEmpty()
                ? Map.of()
                : memberRepository.findByUserIdAndWhiteboardIdIn(caller.getUserId(), sharedIds).stream()
                        .collect(Collectors.toMap(WhiteboardMemberEntity::getWhiteboardId, WhiteboardMemberEntity::getRole));
        Map<Long, String> names = namesOf(rows.stream().map(WhiteboardSummaryView::ownerId).collect(Collectors.toSet()));

        List<WhiteboardSummaryResponse> boards = new ArrayList<>(rows.size());
        for (WhiteboardSummaryView row : rows) {
            WhiteboardAccess access = row.ownerId().equals(caller.getUserId())
                    ? WhiteboardAccess.OWNER
                    : WhiteboardAccess.of(roles.get(row.id()));
            boards.add(new WhiteboardSummaryResponse(
                    row.id(), row.title(), row.ownerId(), names.get(row.ownerId()), access, row.version(), row.updatedAt()));
        }
        return boards;
    }

    @Override
    @Transactional
    public WhiteboardDetailResponse createBoard(CreateWhiteboardRequest request, UserPrincipal caller) {
        if (whiteboardRepository.countActiveByOwnerId(caller.getUserId()) >= MAX_OWNED_BOARDS) {
            throw new BusinessException(
                    "WHITEBOARD_LIMIT",
                    "You can own at most " + MAX_OWNED_BOARDS + " whiteboards. Delete one you no longer need.",
                    HttpStatus.UNPROCESSABLE_ENTITY);
        }
        WhiteboardScenes.Canonical empty = scenes.empty();
        WhiteboardEntity board = whiteboardRepository.saveAndFlush(new WhiteboardEntity(
                caller.getCompanyId(), caller.getUserId(), request.title().trim(), empty.json(), empty.bytes()));
        return toDetail(board, WhiteboardAccess.OWNER);
    }

    @Override
    @Transactional(readOnly = true)
    public WhiteboardDetailResponse getBoard(Long id, UserPrincipal caller) {
        WhiteboardEntity board = whiteboardRepository.findActiveById(id)
                .orElseThrow(() -> new ResourceNotFoundException(RESOURCE, id));
        return toDetail(board, accessOf(board, caller));
    }

    @Override
    @Transactional(readOnly = true)
    public WhiteboardVersionResponse getVersion(Long id, UserPrincipal caller) {
        WhiteboardEntity board = whiteboardRepository.findActiveById(id)
                .orElseThrow(() -> new ResourceNotFoundException(RESOURCE, id));
        accessOf(board, caller);
        return toVersion(board);
    }

    @Override
    @Transactional
    public WhiteboardVersionResponse saveScene(Long id, SaveWhiteboardSceneRequest request, UserPrincipal caller) {
        // Locked first, so the version compared below is the one this save will overwrite.
        WhiteboardEntity board = whiteboardRepository.findActiveByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(RESOURCE, id));
        if (!accessOf(board, caller).canEdit()) {
            throw new AccessDeniedException("Only the owner and editors can change this whiteboard");
        }
        if (!board.getVersion().equals(request.baseVersion())) {
            throw new BusinessException(
                    "WHITEBOARD_CONFLICT",
                    "Someone else saved this whiteboard first. Their changes are merged in before saving again.",
                    HttpStatus.CONFLICT);
        }
        WhiteboardScenes.Canonical scene = scenes.canonicalize(request.elements());
        board.replaceScene(scene.json(), scene.bytes(), caller.getUserId());
        whiteboardRepository.saveAndFlush(board);
        return toVersion(board);
    }

    @Override
    @Transactional
    public WhiteboardSummaryResponse renameBoard(Long id, RenameWhiteboardRequest request, UserPrincipal caller) {
        WhiteboardEntity board = requireOwned(id, caller);
        board.rename(request.title().trim());
        whiteboardRepository.saveAndFlush(board);
        return new WhiteboardSummaryResponse(
                board.getId(), board.getTitle(), board.getOwnerId(), nameOf(board.getOwnerId()), WhiteboardAccess.OWNER,
                board.getVersion(), board.getUpdatedAt());
    }

    @Override
    @Transactional
    public void deleteBoard(Long id, UserPrincipal caller) {
        WhiteboardEntity board = requireOwned(id, caller);
        board.markDeleted();
        log.info("Whiteboard {} deleted by user {}", id, caller.getUserId());
    }

    @Override
    @Transactional
    public List<WhiteboardMemberResponse> setMember(
            Long id, Long userId, SetWhiteboardMemberRequest request, UserPrincipal caller) {
        // Locked so two changes to the same board's members run one after the other (member cap, duplicate rows).
        WhiteboardEntity board = whiteboardRepository.findActiveByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(RESOURCE, id));
        requireOwner(board, caller);
        if (userId.equals(board.getOwnerId())) {
            throw new BusinessException(
                    "OWNER_ALREADY_HAS_ACCESS", "The owner already has full access to this whiteboard", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        UserEntity user = userRepository.findActiveById(userId)
                .filter(u -> u.getCompanyId().equals(caller.getCompanyId()) && u.isActive() && !u.isSystemAccount())
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        WhiteboardMemberEntity existing = memberRepository.findByWhiteboardIdAndUserId(id, userId).orElse(null);
        if (existing != null) {
            existing.changeRole(request.role());
        } else {
            if (memberRepository.countByWhiteboardId(id) >= MAX_MEMBERS) {
                throw new BusinessException(
                        "WHITEBOARD_MEMBER_LIMIT",
                        "A whiteboard can be shared with at most " + MAX_MEMBERS + " people",
                        HttpStatus.UNPROCESSABLE_ENTITY);
            }
            memberRepository.save(new WhiteboardMemberEntity(id, user.getId(), request.role()));
            notificationService.notify(
                    user.getId(), NotificationType.WHITEBOARD_SHARED, "Bạn được chia sẻ một bảng trắng",
                    caller.getUsername() + " đã chia sẻ bảng trắng \"" + board.getTitle() + "\" với bạn",
                    Map.of("actor", caller.getUsername(), "board", board.getTitle(), "role", request.role().name()),
                    "WHITEBOARD", id);
            log.info("Whiteboard {} shared with user {} as {}", id, userId, request.role());
        }
        return membersOf(board);
    }

    @Override
    @Transactional
    public void removeMember(Long id, Long userId, UserPrincipal caller) {
        WhiteboardEntity board = whiteboardRepository.findActiveByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(RESOURCE, id));
        WhiteboardAccess access = accessOf(board, caller);
        if (userId.equals(board.getOwnerId())) {
            throw new BusinessException(
                    "OWNER_CANNOT_LEAVE", "The owner cannot leave their own whiteboard; delete it instead", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        if (access != WhiteboardAccess.OWNER && !userId.equals(caller.getUserId())) {
            throw new AccessDeniedException("Only the owner can remove other people from this whiteboard");
        }
        WhiteboardMemberEntity member = memberRepository.findByWhiteboardIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Whiteboard member", userId));
        memberRepository.delete(member);
    }

    // ------------------------------------------------------------------ access

    /** The caller's relation to {@code board}; "not found" when they have none. */
    private WhiteboardAccess accessOf(WhiteboardEntity board, UserPrincipal caller) {
        if (!board.getCompanyId().equals(caller.getCompanyId())) {
            throw new ResourceNotFoundException(RESOURCE, board.getId());
        }
        if (board.getOwnerId().equals(caller.getUserId())) {
            return WhiteboardAccess.OWNER;
        }
        return memberRepository.findByWhiteboardIdAndUserId(board.getId(), caller.getUserId())
                .map(member -> WhiteboardAccess.of(member.getRole()))
                .orElseThrow(() -> new ResourceNotFoundException(RESOURCE, board.getId()));
    }

    private WhiteboardEntity requireOwned(Long id, UserPrincipal caller) {
        WhiteboardEntity board = whiteboardRepository.findActiveById(id)
                .orElseThrow(() -> new ResourceNotFoundException(RESOURCE, id));
        requireOwner(board, caller);
        return board;
    }

    private void requireOwner(WhiteboardEntity board, UserPrincipal caller) {
        if (accessOf(board, caller) != WhiteboardAccess.OWNER) {
            throw new AccessDeniedException("Only the owner can do this");
        }
    }

    // ------------------------------------------------------------------ mapping

    private WhiteboardDetailResponse toDetail(WhiteboardEntity board, WhiteboardAccess access) {
        List<WhiteboardMemberResponse> members = membersOf(board);
        Map<Long, String> names = members.stream()
                .collect(Collectors.toMap(WhiteboardMemberResponse::userId, m -> nullToEmpty(m.fullName()), (first, second) -> first));
        Long updatedBy = board.getUpdatedByUserId();
        String updatedByName = updatedBy == null ? null : names.getOrDefault(updatedBy, nameOf(updatedBy));
        return new WhiteboardDetailResponse(
                board.getId(), board.getTitle(), board.getOwnerId(), names.get(board.getOwnerId()), access,
                board.getVersion(), board.getUpdatedAt(), updatedByName, members, board.getScene());
    }

    private WhiteboardVersionResponse toVersion(WhiteboardEntity board) {
        Long updatedBy = board.getUpdatedByUserId();
        return new WhiteboardVersionResponse(board.getVersion(), board.getUpdatedAt(), updatedBy == null ? null : nameOf(updatedBy));
    }

    /** The owner first, then the people it was shared with in the order they were added. */
    private List<WhiteboardMemberResponse> membersOf(WhiteboardEntity board) {
        List<WhiteboardMemberEntity> rows = memberRepository.findByWhiteboardIdOrderByIdAsc(board.getId());
        Set<Long> ids = new HashSet<>();
        ids.add(board.getOwnerId());
        rows.forEach(row -> ids.add(row.getUserId()));
        Map<Long, String> names = namesOf(ids);

        List<WhiteboardMemberResponse> members = new ArrayList<>(rows.size() + 1);
        members.add(new WhiteboardMemberResponse(board.getOwnerId(), names.get(board.getOwnerId()), WhiteboardAccess.OWNER));
        for (WhiteboardMemberEntity row : rows) {
            members.add(new WhiteboardMemberResponse(row.getUserId(), names.get(row.getUserId()), WhiteboardAccess.of(row.getRole())));
        }
        return members;
    }

    /** Includes people deleted since, so a board still shows who owns it or last changed it. */
    private Map<Long, String> namesOf(Collection<Long> userIds) {
        return userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(UserEntity::getId, user -> nullToEmpty(user.getFullName())));
    }

    private String nameOf(Long userId) {
        return userRepository.findById(userId).map(UserEntity::getFullName).orElse(null);
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
