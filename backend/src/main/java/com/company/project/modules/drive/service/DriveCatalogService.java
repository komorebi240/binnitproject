package com.company.project.modules.drive.service;

import com.company.project.modules.drive.dto.request.RegisterFolderRequest;
import com.company.project.modules.drive.dto.response.CatalogFolderResponse;
import com.company.project.security.UserPrincipal;

import java.util.List;

public interface DriveCatalogService {

    CatalogFolderResponse registerFolder(RegisterFolderRequest request, UserPrincipal caller);

    List<CatalogFolderResponse> listCatalog(UserPrincipal caller);
}
