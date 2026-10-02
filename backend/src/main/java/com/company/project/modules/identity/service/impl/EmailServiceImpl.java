package com.company.project.modules.identity.service.impl;

import com.company.project.modules.identity.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

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
 */
@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailServiceImpl.class);

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final boolean devLog;

    public EmailServiceImpl(
            @Autowired(required = false) JavaMailSender mailSender,
            @Value("${spring.mail.username:}") String fromAddress,
            @Value("${app.mail.dev-log:false}") boolean devLog,
            Environment environment
    ) {
        if (devLog && environment.acceptsProfiles(Profiles.of("prod"))) {
            throw new IllegalStateException("app.mail.dev-log must never be enabled under the prod profile");
        }
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.devLog = devLog;
    }

    @Override
    public boolean isConfigured() {
        return devLog || (mailSender != null && !fromAddress.isBlank());
    }

    @Override
    public void sendPasswordResetOtp(String toEmail, String otp) {
        send(toEmail, "Mã OTP khôi phục mật khẩu",
                "Mã OTP của bạn là: " + otp + "\n\n"
                        + "Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, "
                        + "hãy bỏ qua email này.");
    }

    @Override
    public void sendRegistrationOtp(String toEmail, String otp) {
        send(toEmail, "Mã xác minh đăng ký Orbit",
                "Mã xác minh của bạn là: " + otp + "\n\n"
                        + "Mã có hiệu lực trong 10 phút. Nếu bạn không đăng ký Orbit, hãy bỏ qua email này.");
    }

    @Override
    public void sendInvitation(String toEmail, String companyName, String inviterName, String inviteLink) {
        send(toEmail, "Lời mời tham gia " + companyName + " trên Orbit",
                inviterName + " đã mời bạn tham gia " + companyName + " trên Orbit.\n\n"
                        + "Mở liên kết sau để tạo tài khoản (hiệu lực 7 ngày):\n" + inviteLink + "\n\n"
                        + "Nếu bạn không biết lời mời này, hãy bỏ qua email.");
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
