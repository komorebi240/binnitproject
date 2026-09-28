package com.company.project.modules.drive.controller;

import com.company.project.common.ApiResponse;
import com.company.project.modules.drive.dto.request.RegisterFolderRequest;
import com.company.project.modules.drive.dto.response.CatalogFolderResponse;
import com.company.project.modules.drive.service.DriveCatalogService;
import com.company.project.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/drive/catalog")
public class DriveCatalogController {

    private final DriveCatalogService driveCatalogService;

    public DriveCatalogController(DriveCatalogService driveCatalogService) {
        this.driveCatalogService = driveCatalogService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CatalogFolderResponse> register(
            @Valid @RequestBody RegisterFolderRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(driveCatalogService.registerFolder(request, caller));
    }

    @GetMapping
    public ApiResponse<List<CatalogFolderResponse>> list(@AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(driveCatalogService.listCatalog(caller));
    }
}
