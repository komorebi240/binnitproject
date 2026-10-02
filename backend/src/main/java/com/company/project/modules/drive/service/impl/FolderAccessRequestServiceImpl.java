package com.company.project.modules.drive.service.impl;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.FolderRequestStatus;
import com.company.project.common.NotificationType;
import com.company.project.common.exception.BusinessException;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.drive.domain.DepartmentDriveFolderEntity;
import com.company.project.modules.drive.domain.FolderAccessRequestEntity;
import com.company.project.modules.drive.dto.request.CreateFolderAccessRequest;
import com.company.project.modules.drive.dto.response.FolderAccessRequestResponse;
import com.company.project.modules.drive.repository.DepartmentDriveFolderRepository;
import com.company.project.modules.drive.repository.FolderAccessRequestRepository;
import com.company.project.modules.drive.service.DriveConnectionService;
import com.company.project.modules.drive.service.FolderAccessRequestService;
import com.company.project.modules.drive.service.GoogleDriveClient;
import com.company.project.modules.identity.domain.DepartmentEntity;
import com.company.project.modules.identity.domain.PositionEntity;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.repository.DepartmentRepository;
import com.company.project.modules.identity.repository.PositionRepository;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.notifications.service.NotificationService;
import com.company.project.security.UserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Who may approve/reject mirrors TaskServiceImpl's department-scope check: the folder's owning
 * department's head, or an executive - matching the original spec ("trưởng ban truyền thông có
 * thể duyệt... tương tự cho quản lý cấp cao (toàn quyền)"). Approval calls the real Google
 * Drive API to grant the requester's own connected account reader access - see the Phase 3 plan.
 */
@Service
public class FolderAccessRequestServiceImpl implements FolderAccessRequestService {

    private final FolderAccessRequestRepository requestRepository;
    private final DepartmentDriveFolderRepository catalogRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final DriveConnectionService driveConnectionService;
    private final GoogleDriveClient googleDriveClient;
    private final PositionRepository positionRepository;
    private final NotificationService notificationService;

    public FolderAccessRequestServiceImpl(
            FolderAccessRequestRepository requestRepository,
            DepartmentDriveFolderRepository catalogRepository,
            DepartmentRepository departmentRepository,
            UserRepository userRepository,
            DriveConnectionService driveConnectionService,
            GoogleDriveClient googleDriveClient,
            PositionRepository positionRepository,
            NotificationService notificationService
    ) {
        this.requestRepository = requestRepository;
        this.catalogRepository = catalogRepository;
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
        this.driveConnectionService = driveConnectionService;
        this.googleDriveClient = googleDriveClient;
        this.positionRepository = positionRepository;
        this.notificationService = notificationService;
    }

    @Override
    @Transactional
    public FolderAccessRequestResponse createRequest(CreateFolderAccessRequest request, UserPrincipal caller) {
        DepartmentDriveFolderEntity folder = catalogRepository.findActiveById(request.catalogFolderId())
                .orElseThrow(() -> new ResourceNotFoundException("Folder", request.catalogFolderId()));
        if (!folder.getCompanyId().equals(caller.getCompanyId())) {
            throw new ResourceNotFoundException("Folder", request.catalogFolderId());
        }
        if (folder.getDepartmentId().equals(caller.getDepartmentId())) {
            throw new BusinessException(
                    "OWN_DEPARTMENT_FOLDER", "This folder already belongs to your own department", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        // Fail fast here rather than surprising the approver later - DRIVE_NOT_CONNECTED (422)
        // if this requester hasn't connected their own Google Drive yet.
        driveConnectionService.getConnectedEmail(caller.getUserId());

        FolderAccessRequestEntity saved = requestRepository.save(new FolderAccessRequestEntity(
                caller.getCompanyId(), folder.getId(), caller.getUserId(), caller.getDepartmentId(), request.note()));

        notifyApprovers(folder, caller, saved.getId());

        return toResponses(List.of(saved)).get(0);
    }

    /** Everyone who could call assertCanDecide successfully on this request: the folder's own department head(s), plus every executive in the company. */
    private void notifyApprovers(DepartmentDriveFolderEntity folder, UserPrincipal requester, Long requestId) {
        List<Long> companyUserIds = userRepository.findAllActiveByCompanyId(folder.getCompanyId()).stream()
                .map(UserEntity::getId)
                .toList();
        List<Long> approverUserIds = positionRepository.findAllActiveByUserIds(companyUserIds).stream()
                .filter(p -> p.getAuthorityLevel() == AuthorityLevel.EXECUTIVE
                        || (p.getAuthorityLevel() == AuthorityLevel.DEPARTMENT_HEAD
                                && p.getDepartmentId().equals(folder.getDepartmentId())))
                .map(PositionEntity::getUserId)
                .distinct()
                .toList();

        for (Long approverUserId : approverUserIds) {
            notificationService.notify(
                    approverUserId,
                    NotificationType.FOLDER_ACCESS_REQUESTED,
                    "Yêu cầu truy cập folder mới",
                    requester.getUsername() + " xin quyền vào \"" + folder.getGoogleFolderName() + "\"",
                    "FOLDER_ACCESS_REQUEST",
                    requestId);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<FolderAccessRequestResponse> listRequests(UserPrincipal caller) {
        List<FolderAccessRequestEntity> requests = switch (caller.getAuthorityLevel()) {
            case EXECUTIVE -> requestRepository.findAllActiveByCompanyId(caller.getCompanyId());
            case DEPARTMENT_HEAD -> requestRepository.findAllActiveForUserOrAuthorizedFolders(
                    caller.getUserId(), catalogRepository.findIdsByDepartmentId(caller.getDepartmentId()));
            case TEAM_LEAD, EMPLOYEE -> requestRepository.findAllActiveForUserOrAuthorizedFolders(
                    caller.getUserId(), List.of());
        };
        return toResponses(requests);
    }

    @Override
    @Transactional
    public FolderAccessRequestResponse approveRequest(Long requestId, UserPrincipal caller) {
        FolderAccessRequestEntity request = requireOwnCompanyRequest(requestId, caller);
        DepartmentDriveFolderEntity folder = catalogRepository.findActiveById(request.getCatalogFolderId())
                .orElseThrow(() -> new ResourceNotFoundException("Folder", request.getCatalogFolderId()));
        assertCanDecide(caller, folder);
        requirePending(request, "approve");

        String requesterEmail = driveConnectionService.getConnectedEmail(request.getRequesterUserId());
        String ownerAccessToken = driveConnectionService.getValidAccessToken(folder.getConnectionUserId());
        googleDriveClient.grantReaderPermission(folder.getGoogleFolderId(), requesterEmail, ownerAccessToken);

        request.approve(caller.getUserId());
        return toResponses(List.of(request)).get(0);
    }

    @Override
    @Transactional
    public FolderAccessRequestResponse rejectRequest(Long requestId, UserPrincipal caller) {
        FolderAccessRequestEntity request = requireOwnCompanyRequest(requestId, caller);
        DepartmentDriveFolderEntity folder = catalogRepository.findActiveById(request.getCatalogFolderId())
                .orElseThrow(() -> new ResourceNotFoundException("Folder", request.getCatalogFolderId()));
        assertCanDecide(caller, folder);
        requirePending(request, "reject");

        request.reject(caller.getUserId());
        return toResponses(List.of(request)).get(0);
    }

    private void assertCanDecide(UserPrincipal caller, DepartmentDriveFolderEntity folder) {
        boolean allowed = caller.getAuthorityLevel() == AuthorityLevel.EXECUTIVE
                || (caller.getAuthorityLevel() == AuthorityLevel.DEPARTMENT_HEAD
                        && folder.getDepartmentId().equals(caller.getDepartmentId()));
        if (!allowed) {
            throw new AccessDeniedException("Only that folder's owning department head or an executive may decide this request");
        }
    }

    private void requirePending(FolderAccessRequestEntity request, String action) {
        if (request.getStatus() != FolderRequestStatus.PENDING) {
            throw new BusinessException(
                    "INVALID_REQUEST_STATUS",
                    "Cannot " + action + " a request in status " + request.getStatus(),
                    HttpStatus.UNPROCESSABLE_ENTITY);
        }
    }

    private FolderAccessRequestEntity requireOwnCompanyRequest(Long requestId, UserPrincipal caller) {
        FolderAccessRequestEntity request = requestRepository.findActiveById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("FolderAccessRequest", requestId));
        if (!request.getCompanyId().equals(caller.getCompanyId())) {
            throw new ResourceNotFoundException("FolderAccessRequest", requestId);
        }
        return request;
    }

    private List<FolderAccessRequestResponse> toResponses(List<FolderAccessRequestEntity> requests) {
        Set<Long> folderIds = requests.stream().map(FolderAccessRequestEntity::getCatalogFolderId).collect(Collectors.toSet());
        Map<Long, DepartmentDriveFolderEntity> foldersById = catalogRepository.findAllById(folderIds).stream()
                .collect(Collectors.toMap(DepartmentDriveFolderEntity::getId, f -> f));

        Set<Long> departmentIds = new HashSet<>();
        Set<Long> userIds = new HashSet<>();
        for (FolderAccessRequestEntity r : requests) {
            departmentIds.add(r.getRequesterDepartmentId());
            userIds.add(r.getRequesterUserId());
            if (r.getDecidedByUserId() != null) {
                userIds.add(r.getDecidedByUserId());
            }
            DepartmentDriveFolderEntity folder = foldersById.get(r.getCatalogFolderId());
            if (folder != null) {
                departmentIds.add(folder.getDepartmentId());
            }
        }

        Map<Long, String> departmentNames = departmentRepository.findAllById(departmentIds).stream()
                .collect(Collectors.toMap(DepartmentEntity::getId, DepartmentEntity::getName));
        Map<Long, String> userNames = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(UserEntity::getId, UserEntity::getFullName));

        return requests.stream().map(r -> {
            DepartmentDriveFolderEntity folder = foldersById.get(r.getCatalogFolderId());
            return new FolderAccessRequestResponse(
                    r.getId(),
                    r.getCatalogFolderId(),
                    folder != null ? folder.getGoogleFolderName() : null,
                    folder != null ? folder.getDepartmentId() : null,
                    folder != null ? departmentNames.get(folder.getDepartmentId()) : null,
                    r.getRequesterUserId(),
                    userNames.get(r.getRequesterUserId()),
                    r.getRequesterDepartmentId(),
                    departmentNames.get(r.getRequesterDepartmentId()),
                    r.getStatus(),
                    r.getDecidedByUserId(),
                    r.getDecidedByUserId() != null ? userNames.get(r.getDecidedByUserId()) : null,
                    r.getDecidedAt(),
                    r.getNote(),
                    r.getCreatedAt());
        }).toList();
    }
}
