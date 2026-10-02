package com.company.project.modules.identity.controller;

import com.company.project.common.ApiResponse;
import com.company.project.common.RateLimitGuard;
import com.company.project.modules.identity.dto.request.UpdateCompanyRequest;
import com.company.project.modules.identity.dto.response.CompanyResponse;
import com.company.project.modules.identity.service.AvatarStorageService;
import com.company.project.modules.identity.service.OrganizationService;
import com.company.project.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;

@RestController
@RequestMapping("/api/v1/companies")
public class CompanyController {

    private final OrganizationService organizationService;
    private final RateLimitGuard rateLimitGuard;

    public CompanyController(OrganizationService organizationService, RateLimitGuard rateLimitGuard) {
        this.organizationService = organizationService;
        this.rateLimitGuard = rateLimitGuard;
    }

    @GetMapping("/me")
    public ApiResponse<CompanyResponse> getMyCompany(@AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(organizationService.getMyCompany(caller));
    }

    @PatchMapping("/me")
    @PreAuthorize("hasAuthority('EXECUTIVE')")
    public ApiResponse<CompanyResponse> updateMyCompany(
            @Valid @RequestBody UpdateCompanyRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        return ApiResponse.success(organizationService.updateCompany(request, caller));
    }

    @PostMapping(value = "/me/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('EXECUTIVE')")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CompanyResponse> uploadLogo(
            @RequestParam MultipartFile file, @AuthenticationPrincipal UserPrincipal caller) {
        rateLimitGuard.enforce("company-logo:" + caller.getUserId(), 10, Duration.ofHours(1));
        return ApiResponse.success(organizationService.uploadCompanyLogo(file, caller));
    }

    /** Same visibility as the company profile: any member of this company (never another company's logo). */
    @GetMapping("/me/logo")
    public ResponseEntity<InputStreamResource> getLogo(@AuthenticationPrincipal UserPrincipal caller) {
        AvatarStorageService.Resolved logo = organizationService.getCompanyLogoFile(caller);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(logo.contentType()))
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=300")
                .header("X-Content-Type-Options", "nosniff")
                .contentLength(logo.sizeBytes())
                .body(new InputStreamResource(logo.data()));
    }
}
