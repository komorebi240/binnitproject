package com.company.project.modules.drive.service.impl;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.exception.BusinessException;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.identity.domain.DepartmentEntity;
import com.company.project.modules.identity.repository.DepartmentRepository;
import com.company.project.modules.drive.domain.DepartmentDriveFolderEntity;
import com.company.project.modules.drive.dto.request.RegisterFolderRequest;
import com.company.project.modules.drive.dto.response.CatalogFolderResponse;
import com.company.project.modules.drive.dto.response.FolderShareResult;
import com.company.project.modules.drive.repository.DepartmentDriveFolderRepository;
import com.company.project.modules.drive.service.DriveCatalogService;
import com.company.project.modules.drive.service.DriveConnectionService;
import com.company.project.modules.drive.service.GoogleDriveClient;
import com.company.project.modules.drive.service.GoogleFolderMetadata;
import com.company.project.security.UserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class DriveCatalogServiceImpl implements DriveCatalogService {

    private static final Logger log = LoggerFactory.getLogger(DriveCatalogServiceImpl.class);
    private static final Pattern FOLDER_URL_PATTERN = Pattern.compile("folders/([a-zA-Z0-9_-]+)");

    private final DepartmentDriveFolderRepository catalogRepository;
    private final DepartmentRepository departmentRepository;
    private final DriveConnectionService driveConnectionService;
    private final GoogleDriveClient googleDriveClient;

    public DriveCatalogServiceImpl(
            DepartmentDriveFolderRepository catalogRepository,
            DepartmentRepository departmentRepository,
            DriveConnectionService driveConnectionService,
            GoogleDriveClient googleDriveClient
    ) {
        this.catalogRepository = catalogRepository;
        this.departmentRepository = departmentRepository;
        this.driveConnectionService = driveConnectionService;
        this.googleDriveClient = googleDriveClient;
    }

    @Override
    @Transactional
    public CatalogFolderResponse registerFolder(RegisterFolderRequest request, UserPrincipal caller) {
        Long targetDepartmentId = resolveTargetDepartment(request, caller);
        String folderId = extractFolderId(request.folderLinkOrId());

        if (catalogRepository.existsByDepartmentIdAndGoogleFolderIdAndDeletedFalse(targetDepartmentId, folderId)) {
            throw new BusinessException(
                    "FOLDER_ALREADY_REGISTERED", "This folder is already registered for that department", HttpStatus.CONFLICT);
        }

        String accessToken = driveConnectionService.getValidAccessToken(caller.getUserId());
        GoogleFolderMetadata metadata = googleDriveClient.getFolderMetadata(folderId, accessToken);

        DepartmentDriveFolderEntity saved = catalogRepository.save(new DepartmentDriveFolderEntity(
                caller.getCompanyId(), targetDepartmentId, caller.getUserId(), metadata.id(), metadata.name()));

        DepartmentEntity department = departmentRepository.findActiveById(targetDepartmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Department", targetDepartmentId));
        return toResponse(saved, department.getName());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CatalogFolderResponse> listCatalog(UserPrincipal caller) {
        List<DepartmentDriveFolderEntity> folders = catalogRepository.findAllActiveByCompanyId(caller.getCompanyId());

        Map<Long, String> departmentNames = departmentRepository.findAllById(
                        folders.stream().map(DepartmentDriveFolderEntity::getDepartmentId).distinct().toList())
                .stream()
                .collect(Collectors.toMap(DepartmentEntity::getId, DepartmentEntity::getName));

        return folders.stream()
                .map(f -> toResponse(f, departmentNames.get(f.getDepartmentId())))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CatalogFolderResponse requireShareableFolder(Long catalogFolderId, UserPrincipal caller) {
        DepartmentDriveFolderEntity folder = catalogRepository.findActiveById(catalogFolderId)
                .filter(f -> f.getCompanyId().equals(caller.getCompanyId()))
                .orElseThrow(() -> new ResourceNotFoundException("Folder", catalogFolderId));
        boolean allowed = caller.getAuthorityLevel() == AuthorityLevel.EXECUTIVE
                || (caller.getAuthorityLevel() == AuthorityLevel.DEPARTMENT_HEAD
                        && folder.getDepartmentId().equals(caller.getDepartmentId()));
        if (!allowed) {
            throw new AccessDeniedException("Only that folder's owning department head or an executive may share it");
        }
        String departmentName = departmentRepository.findActiveById(folder.getDepartmentId())
                .map(DepartmentEntity::getName)
                .orElse(null);
        return toResponse(folder, departmentName);
    }

    @Override
    @Transactional(readOnly = true)
    public FolderShareResult grantReaderAccess(Long catalogFolderId, List<Long> userIds) {
        DepartmentDriveFolderEntity folder = catalogRepository.findActiveById(catalogFolderId)
                .orElseThrow(() -> new ResourceNotFoundException("Folder", catalogFolderId));
        int granted = 0;
        int notConnected = 0;
        int failed = 0;
        String ownerToken = null;
        for (Long userId : userIds) {
            try {
                String email = driveConnectionService.getConnectedEmail(userId);
                if (ownerToken == null) {
                    ownerToken = driveConnectionService.getValidAccessToken(folder.getConnectionUserId());
                }
                googleDriveClient.grantReaderPermission(folder.getGoogleFolderId(), email, ownerToken);
                granted++;
            } catch (BusinessException e) {
                if ("DRIVE_NOT_CONNECTED".equals(e.getCode())) {
                    notConnected++;
                } else {
                    failed++;
                    log.warn("Could not share catalog folder {} with user {}: {}", catalogFolderId, userId, e.getCode());
                }
            }
        }
        return new FolderShareResult(granted, notConnected, failed);
    }

    private Long resolveTargetDepartment(RegisterFolderRequest request, UserPrincipal caller) {
        if (caller.getAuthorityLevel() == AuthorityLevel.EXECUTIVE) {
            if (request.departmentId() == null) {
                throw new BusinessException(
                        "DEPARTMENT_REQUIRED", "departmentId is required for an executive", HttpStatus.UNPROCESSABLE_ENTITY);
            }
            DepartmentEntity department = departmentRepository.findActiveById(request.departmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Department", request.departmentId()));
            if (!department.getCompanyId().equals(caller.getCompanyId())) {
                throw new ResourceNotFoundException("Department", request.departmentId());
            }
            return department.getId();
        }
        // Every other role registers into their own department only. If they don't send a
        // departmentId, default to their own; if they explicitly send a different one, reject
        // it loudly (403) rather than silently overriding it - silent override would still be
        // safe, but a mismatched value here is either a bug or an attempt worth surfacing.
        if (request.departmentId() != null && !request.departmentId().equals(caller.getDepartmentId())) {
            throw new AccessDeniedException("You can only register folders for your own department");
        }
        return caller.getDepartmentId();
    }

    private static String extractFolderId(String linkOrId) {
        Matcher matcher = FOLDER_URL_PATTERN.matcher(linkOrId);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return linkOrId.trim();
    }

    private CatalogFolderResponse toResponse(DepartmentDriveFolderEntity entity, String departmentName) {
        return new CatalogFolderResponse(
                entity.getId(), entity.getDepartmentId(), departmentName, entity.getGoogleFolderId(), entity.getGoogleFolderName());
    }
}
