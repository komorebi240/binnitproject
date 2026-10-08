package com.company.project.modules.legal.controller;

import com.company.project.common.ApiResponse;
import com.company.project.modules.legal.dto.request.AcceptTermsRequest;
import com.company.project.modules.legal.dto.response.TermsResponse;
import com.company.project.modules.legal.service.TermsService;
import com.company.project.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * The terms are public (they are shown before an account exists); accepting needs a signed-in user. These endpoints are
 * exempt from the "accept the terms first" gate (TermsAcceptanceFilter), otherwise nobody could ever accept.
 */
@RestController
@RequestMapping("/api/v1/terms")
public class TermsController {

    private final TermsService termsService;

    public TermsController(TermsService termsService) {
        this.termsService = termsService;
    }

    @GetMapping("/current")
    public ApiResponse<TermsResponse> current(@RequestParam(name = "lang", required = false) String language) {
        return ApiResponse.success(termsService.getCurrent(language));
    }

    @PostMapping("/accept")
    public ApiResponse<Void> accept(@Valid @RequestBody AcceptTermsRequest request, @AuthenticationPrincipal UserPrincipal caller) {
        termsService.accept(caller.getUserId(), request.version());
        return ApiResponse.success(null);
    }
}
