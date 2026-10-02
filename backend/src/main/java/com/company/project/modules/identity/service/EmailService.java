package com.company.project.modules.identity.service;

public interface EmailService {

    /** True once SMTP credentials are actually configured (or local dev-log mode is on) - see EmailServiceImpl javadoc. */
    boolean isConfigured();

    void sendPasswordResetOtp(String toEmail, String otp);

    void sendRegistrationOtp(String toEmail, String otp);

    /** {@code inviteLink} is the full URL the invitee opens to create their account. */
    void sendInvitation(String toEmail, String companyName, String inviterName, String inviteLink);
}
