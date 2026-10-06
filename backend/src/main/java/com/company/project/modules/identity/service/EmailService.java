package com.company.project.modules.identity.service;

public interface EmailService {

    /** True once SMTP credentials are actually configured (or local dev-log mode is on) - see EmailServiceImpl javadoc. */
    boolean isConfigured();

    void sendPasswordResetOtp(String toEmail, String otp);

    void sendRegistrationOtp(String toEmail, String otp);

    /** Sent to the NEW address; the change only happens once the code is confirmed. */
    void sendEmailChangeOtp(String toEmail, String otp);

    /** Security notice to the address that was replaced. */
    void sendEmailChangedNotice(String oldEmail, String newEmail);

    /** {@code inviteLink} is the full URL the invitee opens to create their account. */
    void sendInvitation(String toEmail, String companyName, String inviterName, String inviteLink);
}
