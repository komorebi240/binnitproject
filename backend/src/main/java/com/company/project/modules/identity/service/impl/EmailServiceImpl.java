package com.company.project.modules.identity.service.impl;

import com.company.project.modules.identity.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.core.env.Profiles;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.Locale;

/**
 * Sends real email via Gmail SMTP (spring-boot-starter-mail, configured through spring.mail.*
 * - see application.yml and backend/README.md for the App Password setup steps). SMTP is an
 * OPTIONAL integration: {@code spring.mail.*} has no defaults set, so when it is left unconfigured
 * Spring Boot simply does not create a {@link JavaMailSender} bean - {@code mailSender} is null in
 * that case rather than crashing the whole application (CLAUDE.md section 35: a failed/unavailable
 * external integration must not take down the rest of the system). {@link #isConfigured()} lets
 * callers fail just their feature cleanly instead of pretending an email was sent.
 *
 * <p><b>Dev-log mode</b> ({@code app.mail.dev-log=true}, env {@code MAIL_DEV_LOG}): nothing is
 * sent; the message - including the OTP / invite link - is written to the application log so a
 * developer can run the whole flow without a mailbox. Off by default, and the application refuses
 * to start with it enabled under the {@code prod} profile, because it prints secrets.
 *
 * <p>The texts live in {@code messages*.properties} (Vietnamese by default, English for an English reader). The
 * language is the one of the request being served ({@link LocaleContextHolder}, set from Accept-Language, which the
 * frontend fills with the language of its interface); mail is sent inside that request, never from another thread.
 */
@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailServiceImpl.class);

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final boolean devLog;
    private final MessageSource messages;

    public EmailServiceImpl(
            @Autowired(required = false) JavaMailSender mailSender,
            @Value("${spring.mail.username:}") String fromAddress,
            @Value("${app.mail.dev-log:false}") boolean devLog,
            Environment environment,
            MessageSource messages
    ) {
        if (devLog && environment.acceptsProfiles(Profiles.of("prod"))) {
            throw new IllegalStateException("app.mail.dev-log must never be enabled under the prod profile");
        }
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.devLog = devLog;
        this.messages = messages;
    }

    @Override
    public boolean isConfigured() {
        return devLog || (mailSender != null && !fromAddress.isBlank());
    }

    @Override
    public void sendPasswordResetOtp(String toEmail, String otp) {
        sendLocalized(toEmail, "mail.passwordReset", otp);
    }

    @Override
    public void sendRegistrationOtp(String toEmail, String otp) {
        sendLocalized(toEmail, "mail.registration", otp);
    }

    @Override
    public void sendEmailChangeOtp(String toEmail, String otp) {
        sendLocalized(toEmail, "mail.emailChange", otp);
    }

    @Override
    public void sendEmailChangedNotice(String oldEmail, String newEmail) {
        sendLocalized(oldEmail, "mail.emailChanged", newEmail);
    }

    @Override
    public void sendInvitation(String toEmail, String companyName, String inviterName, String inviteLink) {
        sendLocalized(toEmail, "mail.invitation", companyName, inviterName, inviteLink);
    }

    /** Looks up {@code <key>.subject} and {@code <key>.body} in the language of the current request. */
    private void sendLocalized(String toEmail, String key, Object... args) {
        Locale locale = LocaleContextHolder.getLocale();
        send(toEmail, messages.getMessage(key + ".subject", args, locale), messages.getMessage(key + ".body", args, locale));
    }

    private void send(String toEmail, String subject, String text) {
        if (devLog) {
            log.warn("[MAIL DEV-LOG] to={} subject=\"{}\"\n{}", toEmail, subject, text);
            return;
        }
        if (!isConfigured()) {
            // Callers must check isConfigured() first and fail the request explicitly - this
            // is a defensive last resort, not the primary control path (CLAUDE.md section 5).
            log.error("Email requested while SMTP is not configured");
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(toEmail);
        message.setSubject(subject);
        message.setText(text);
        mailSender.send(message);
        log.info("Email sent: {}", subject);
    }
}
