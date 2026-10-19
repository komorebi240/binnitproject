package com.company.project.unit.modules.whiteboards;

import com.company.project.common.AuthorityLevel;
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
import com.company.project.modules.whiteboards.dto.response.WhiteboardSummaryResponse;
import com.company.project.modules.whiteboards.repository.WhiteboardMemberRepository;
import com.company.project.modules.whiteboards.repository.WhiteboardRepository;
import com.company.project.modules.whiteboards.repository.WhiteboardSummaryView;
import com.company.project.modules.whiteboards.service.WhiteboardScenes;
import com.company.project.modules.whiteboards.service.impl.WhiteboardServiceImpl;
import com.company.project.security.UserPrincipal;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Who may see, draw on and share a whiteboard, and how two people saving at once are kept from overwriting each other. */
@ExtendWith(MockitoExtension.class)
class WhiteboardServiceImplTest {

    private static final Long COMPANY = 1L;
    private static final Long OTHER_COMPANY = 2L;
    private static final Long BOARD_ID = 70L;
    private static final Long OWNER = 10L;
    private static final Long EDITOR = 11L;
    private static final Long VIEWER = 12L;
    private static final Long STRANGER = 13L;

    @Mock
    private WhiteboardRepository whiteboardRepository;
    @Mock
    private WhiteboardMemberRepository memberRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private NotificationService notificationService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private WhiteboardServiceImpl service;
    private WhiteboardEntity board;

    @BeforeEach
    void setUp() {
        service = new WhiteboardServiceImpl(
                whiteboardRepository, memberRepository, userRepository, notificationService, new WhiteboardScenes(objectMapper));
        board = new WhiteboardEntity(COMPANY, OWNER, "Kế hoạch Q4", "{\"elements\":[]}", 15);
        setField(board, "id", BOARD_ID);
        setField(board, "version", 4);
        lenient().when(memberRepository.findByWhiteboardIdAndUserId(BOARD_ID, EDITOR))
                .thenReturn(Optional.of(new WhiteboardMemberEntity(BOARD_ID, EDITOR, WhiteboardRole.EDITOR)));
        lenient().when(memberRepository.findByWhiteboardIdAndUserId(BOARD_ID, VIEWER))
                .thenReturn(Optional.of(new WhiteboardMemberEntity(BOARD_ID, VIEWER, WhiteboardRole.VIEWER)));
    }

    private static void setField(Object target, String name, Object value) {
        try {
            Field field = target.getClass().getDeclaredField(name);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    private static UserPrincipal user(Long id, Long companyId) {
        return new UserPrincipal(id, "u" + id, null, companyId, AuthorityLevel.EMPLOYEE, 5L, null, true);
    }

    private SaveWhiteboardSceneRequest save(int baseVersion) {
        ObjectNode rectangle = objectMapper.createObjectNode();
        rectangle.put("id", "r1");
        rectangle.put("type", "rectangle");
        rectangle.put("version", 2);
        return new SaveWhiteboardSceneRequest(baseVersion, List.of(rectangle));
    }

    private UserEntity colleague(Long id, Long companyId, boolean active) {
        UserEntity colleague = mock(UserEntity.class);
        lenient().when(colleague.getId()).thenReturn(id);
        lenient().when(colleague.getCompanyId()).thenReturn(companyId);
        lenient().when(colleague.isActive()).thenReturn(active);
        lenient().when(colleague.isSystemAccount()).thenReturn(false);
        return colleague;
    }

    private static void assertCode(Runnable action, String code) {
        assertThatThrownBy(action::run)
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getCode()).isEqualTo(code));
    }

    // ------------------------------------------------------------------ seeing a board

    @Test
    void anotherCompanysBoardIsNotFoundEvenForItsId() {
        when(whiteboardRepository.findActiveById(BOARD_ID)).thenReturn(Optional.of(board));

        assertThatThrownBy(() -> service.getBoard(BOARD_ID, user(OWNER + 100, OTHER_COMPANY)))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void aColleagueTheBoardWasNotSharedWithCannotSeeIt() {
        when(whiteboardRepository.findActiveById(BOARD_ID)).thenReturn(Optional.of(board));
        when(memberRepository.findByWhiteboardIdAndUserId(BOARD_ID, STRANGER)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getBoard(BOARD_ID, user(STRANGER, COMPANY)))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> service.getVersion(BOARD_ID, user(STRANGER, COMPANY)))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void aViewerSeesTheBoardWithTheirOwnAccess() {
        when(whiteboardRepository.findActiveById(BOARD_ID)).thenReturn(Optional.of(board));

        assertThat(service.getBoard(BOARD_ID, user(VIEWER, COMPANY)).access()).isEqualTo(WhiteboardAccess.VIEWER);
    }

    @Test
    void theListTellsEachBoardsAccess() {
        Instant now = Instant.now();
        when(whiteboardRepository.findVisibleTo(COMPANY, EDITOR)).thenReturn(List.of(
                new WhiteboardSummaryView(1L, "Mine", EDITOR, 0, now),
                new WhiteboardSummaryView(BOARD_ID, "Shared", OWNER, 4, now)));
        when(memberRepository.findByUserIdAndWhiteboardIdIn(EDITOR, List.of(BOARD_ID)))
                .thenReturn(List.of(new WhiteboardMemberEntity(BOARD_ID, EDITOR, WhiteboardRole.EDITOR)));

        List<WhiteboardSummaryResponse> boards = service.listBoards(user(EDITOR, COMPANY));

        assertThat(boards).extracting(WhiteboardSummaryResponse::access)
                .containsExactly(WhiteboardAccess.OWNER, WhiteboardAccess.EDITOR);
    }

    // ------------------------------------------------------------------ saving

    @Test
    void anEditorSavesOntoTheCurrentVersion() {
        when(whiteboardRepository.findActiveByIdForUpdate(BOARD_ID)).thenReturn(Optional.of(board));

        service.saveScene(BOARD_ID, save(4), user(EDITOR, COMPANY));

        assertThat(board.getScene()).contains("\"id\":\"r1\"");
        assertThat(board.getUpdatedByUserId()).isEqualTo(EDITOR);
        verify(whiteboardRepository).saveAndFlush(board);
    }

    @Test
    void aSaveStartedFromAnOlderVersionIsAConflictAndChangesNothing() {
        when(whiteboardRepository.findActiveByIdForUpdate(BOARD_ID)).thenReturn(Optional.of(board));

        assertCode(() -> service.saveScene(BOARD_ID, save(3), user(OWNER, COMPANY)), "WHITEBOARD_CONFLICT");
        assertThat(board.getScene()).isEqualTo("{\"elements\":[]}");
        verify(whiteboardRepository, never()).saveAndFlush(any());
    }

    @Test
    void aViewerCannotDraw() {
        when(whiteboardRepository.findActiveByIdForUpdate(BOARD_ID)).thenReturn(Optional.of(board));

        assertThatThrownBy(() -> service.saveScene(BOARD_ID, save(4), user(VIEWER, COMPANY)))
                .isInstanceOf(AccessDeniedException.class);
        verify(whiteboardRepository, never()).saveAndFlush(any());
    }

    @Test
    void aStrangerCannotSaveAndLearnsNothing() {
        when(whiteboardRepository.findActiveByIdForUpdate(BOARD_ID)).thenReturn(Optional.of(board));

        assertThatThrownBy(() -> service.saveScene(BOARD_ID, save(4), user(STRANGER, OTHER_COMPANY)))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ------------------------------------------------------------------ owner-only actions

    @Test
    void onlyTheOwnerRenamesOrDeletes() {
        when(whiteboardRepository.findActiveById(BOARD_ID)).thenReturn(Optional.of(board));

        assertThatThrownBy(() -> service.renameBoard(BOARD_ID, new RenameWhiteboardRequest("X"), user(EDITOR, COMPANY)))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.deleteBoard(BOARD_ID, user(EDITOR, COMPANY)))
                .isInstanceOf(AccessDeniedException.class);
        assertThat(board.isDeleted()).isFalse();

        service.deleteBoard(BOARD_ID, user(OWNER, COMPANY));
        assertThat(board.isDeleted()).isTrue();
    }

    @Test
    void creatingIsRefusedOnceTheUserOwnsTheMaximum() {
        when(whiteboardRepository.countActiveByOwnerId(OWNER)).thenReturn(100L);

        assertCode(() -> service.createBoard(new CreateWhiteboardRequest("New"), user(OWNER, COMPANY)), "WHITEBOARD_LIMIT");
        verify(whiteboardRepository, never()).saveAndFlush(any());
    }

    @Test
    void aNewBoardIsEmptyAndOwnedByItsCreator() {
        when(whiteboardRepository.countActiveByOwnerId(OWNER)).thenReturn(0L);
        when(whiteboardRepository.saveAndFlush(any(WhiteboardEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        var created = service.createBoard(new CreateWhiteboardRequest("  Sơ đồ  "), user(OWNER, COMPANY));

        assertThat(created.title()).isEqualTo("Sơ đồ");
        assertThat(created.access()).isEqualTo(WhiteboardAccess.OWNER);
        assertThat(created.scene()).isEqualTo("{\"elements\":[]}");
    }

    // ------------------------------------------------------------------ sharing

    @Test
    void theOwnerSharesWithAColleagueWhoIsNotified() {
        when(whiteboardRepository.findActiveByIdForUpdate(BOARD_ID)).thenReturn(Optional.of(board));
        UserEntity colleague = colleague(STRANGER, COMPANY, true);
        when(userRepository.findActiveById(STRANGER)).thenReturn(Optional.of(colleague));
        when(memberRepository.findByWhiteboardIdAndUserId(BOARD_ID, STRANGER)).thenReturn(Optional.empty());

        service.setMember(BOARD_ID, STRANGER, new SetWhiteboardMemberRequest(WhiteboardRole.VIEWER), user(OWNER, COMPANY));

        verify(memberRepository).save(any(WhiteboardMemberEntity.class));
        verify(notificationService).notify(
                eq(STRANGER), eq(NotificationType.WHITEBOARD_SHARED), anyString(), anyString(), anyMap(),
                eq("WHITEBOARD"), eq(BOARD_ID));
    }

    @Test
    void changingAMembersRoleDoesNotNotifyAgain() {
        WhiteboardMemberEntity viewer = new WhiteboardMemberEntity(BOARD_ID, VIEWER, WhiteboardRole.VIEWER);
        UserEntity colleague = colleague(VIEWER, COMPANY, true);
        when(whiteboardRepository.findActiveByIdForUpdate(BOARD_ID)).thenReturn(Optional.of(board));
        when(userRepository.findActiveById(VIEWER)).thenReturn(Optional.of(colleague));
        when(memberRepository.findByWhiteboardIdAndUserId(BOARD_ID, VIEWER)).thenReturn(Optional.of(viewer));

        service.setMember(BOARD_ID, VIEWER, new SetWhiteboardMemberRequest(WhiteboardRole.EDITOR), user(OWNER, COMPANY));

        assertThat(viewer.getRole()).isEqualTo(WhiteboardRole.EDITOR);
        verify(memberRepository, never()).save(any());
        verify(notificationService, never()).notify(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void sharingWithSomeoneOutsideTheCompanyOrDeactivatedIsNotFound() {
        UserEntity foreigner = colleague(50L, OTHER_COMPANY, true);
        UserEntity deactivated = colleague(51L, COMPANY, false);
        when(whiteboardRepository.findActiveByIdForUpdate(BOARD_ID)).thenReturn(Optional.of(board));
        when(userRepository.findActiveById(50L)).thenReturn(Optional.of(foreigner));
        when(userRepository.findActiveById(51L)).thenReturn(Optional.of(deactivated));
        SetWhiteboardMemberRequest editor = new SetWhiteboardMemberRequest(WhiteboardRole.EDITOR);

        assertThatThrownBy(() -> service.setMember(BOARD_ID, 50L, editor, user(OWNER, COMPANY)))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> service.setMember(BOARD_ID, 51L, editor, user(OWNER, COMPANY)))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(memberRepository, never()).save(any());
    }

    @Test
    void anEditorCannotShareAndTheOwnerIsNeverAMember() {
        when(whiteboardRepository.findActiveByIdForUpdate(BOARD_ID)).thenReturn(Optional.of(board));
        SetWhiteboardMemberRequest editor = new SetWhiteboardMemberRequest(WhiteboardRole.EDITOR);

        assertThatThrownBy(() -> service.setMember(BOARD_ID, STRANGER, editor, user(EDITOR, COMPANY)))
                .isInstanceOf(AccessDeniedException.class);
        assertCode(() -> service.setMember(BOARD_ID, OWNER, editor, user(OWNER, COMPANY)), "OWNER_ALREADY_HAS_ACCESS");
    }

    @Test
    void aBoardIsSharedWithAtMostFiftyPeople() {
        UserEntity colleague = colleague(STRANGER, COMPANY, true);
        when(whiteboardRepository.findActiveByIdForUpdate(BOARD_ID)).thenReturn(Optional.of(board));
        when(userRepository.findActiveById(STRANGER)).thenReturn(Optional.of(colleague));
        when(memberRepository.findByWhiteboardIdAndUserId(BOARD_ID, STRANGER)).thenReturn(Optional.empty());
        when(memberRepository.countByWhiteboardId(BOARD_ID)).thenReturn(50L);

        assertCode(() -> service.setMember(
                BOARD_ID, STRANGER, new SetWhiteboardMemberRequest(WhiteboardRole.VIEWER), user(OWNER, COMPANY)),
                "WHITEBOARD_MEMBER_LIMIT");
        verify(memberRepository, never()).save(any());
    }

    @Test
    void aMemberMayLeaveButNotRemoveOthers() {
        when(whiteboardRepository.findActiveByIdForUpdate(BOARD_ID)).thenReturn(Optional.of(board));

        assertThatThrownBy(() -> service.removeMember(BOARD_ID, EDITOR, user(VIEWER, COMPANY)))
                .isInstanceOf(AccessDeniedException.class);
        assertCode(() -> service.removeMember(BOARD_ID, OWNER, user(OWNER, COMPANY)), "OWNER_CANNOT_LEAVE");

        service.removeMember(BOARD_ID, VIEWER, user(VIEWER, COMPANY));
        verify(memberRepository).delete(any(WhiteboardMemberEntity.class));
    }
}
