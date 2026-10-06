package com.company.project.modules.drive.service;

import com.company.project.modules.drive.dto.request.RegisterFolderRequest;
import com.company.project.modules.drive.dto.response.CatalogFolderResponse;
import com.company.project.modules.drive.dto.response.FolderShareResult;
import com.company.project.security.UserPrincipal;

import java.util.List;

public interface DriveCatalogService {

    CatalogFolderResponse registerFolder(RegisterFolderRequest request, UserPrincipal caller);

    List<CatalogFolderResponse> listCatalog(UserPrincipal caller);

    /**
     * The folder, if the caller may decide who gets access to it (an executive, or the owning department's head)
     * and it belongs to the caller's company - the same authority as approving an access request.
     */
    CatalogFolderResponse requireShareableFolder(Long catalogFolderId, UserPrincipal caller);

    /**
     * Internal: gives the given users read access using the folder owner's Drive connection. Only called after
     * {@link #requireShareableFolder} approved the folder for sharing (e.g. when it is linked to a project).
     * One person failing never stops the others.
     */
    FolderShareResult grantReaderAccess(Long catalogFolderId, List<Long> userIds);
}
