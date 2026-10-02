package com.company.project.modules.onboarding.service;

import com.company.project.modules.onboarding.dto.request.RegisterCompanyRequest;

/**
 * Self-service company registration, in three public steps: request an emailed code, exchange the
 * right code for a single-use verification token, then create the company and its first
 * administrator with that token. The admin's email is always the address that was verified.
 */
public interface RegistrationService {

    /** Always completes the same way for any email (never reveals whether it is already used). */
    void requestOtp(String email);

    /** Returns the single-use verification token; throws 422 for a wrong, expired or exhausted code. */
    String verifyOtp(String email, String otp);

    /** Creates the company and its EXECUTIVE; returns the new administrator's username (the controller signs them in). */
    String register(RegisterCompanyRequest request);
}
