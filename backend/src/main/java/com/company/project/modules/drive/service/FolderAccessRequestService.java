package com.company.project.modules.drive.service;

import com.company.project.modules.drive.dto.request.CreateFolderAccessRequest;
import com.company.project.modules.drive.dto.response.FolderAccessRequestResponse;
import com.company.project.security.UserPrincipal;

import java.util.List;

public interface FolderAccessRequestService {

    FolderAccessRequestResponse createRequest(CreateFolderAccessRequest request, UserPrincipal caller);

    List<FolderAccessRequestResponse> listRequests(UserPrincipal caller);

    FolderAccessRequestResponse approveRequest(Long requestId, UserPrincipal caller);

    FolderAccessRequestResponse rejectRequest(Long requestId, UserPrincipal caller);
}
