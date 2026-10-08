package com.company.project.unit.modules.identity;

import com.company.project.modules.identity.service.impl.EmailServiceImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.env.MockEnvironment;

import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class EmailServiceImplTest {

    /** Configured the way Spring Boot configures it from application.yml (UTF-8, no fallback to the server language). */
    private static MessageSource messages() {
        ResourceBundleMessageSource source = new ResourceBundleMessageSource();
        source.setBasename("messages");
        source.setDefaultEncoding("UTF-8");
        source.setFallbackToSystemLocale(false);
        return source;
    }

    private static MockEnvironment environment(String... profiles) {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles(profiles);
        return env;
    }

    @AfterEach
    void resetLocale() {
        LocaleContextHolder.resetLocaleContext();
    }

    private SimpleMailMessage sentWhenRequestLanguageIs(Locale locale, java.util.function.Consumer<EmailServiceImpl> send) {
        LocaleContextHolder.setLocale(locale);
        JavaMailSender sender = mock(JavaMailSender.class);
        EmailServiceImpl service = new EmailServiceImpl(sender, "from@x.test", false, environment("prod"), messages());
        send.accept(service);
        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(sender).send(captor.capture());
        return captor.getValue();
    }

    @Test
    void devLogMustNeverBeEnabledUnderTheProdProfile() {
        assertThatThrownBy(() -> new EmailServiceImpl(null, "", true, environment("prod"), messages()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("prod");
    }

    @Test
    void devLogWorksWithoutSmtpAndNeverCallsTheMailSender() {
        JavaMailSender sender = mock(JavaMailSender.class);
        EmailServiceImpl service = new EmailServiceImpl(sender, "", true, environment("dev"), messages());

        assertThat(service.isConfigured()).isTrue();
        service.sendRegistrationOtp("a@b.test", "123456");
        service.sendInvitation("a@b.test", "Acme", "Boss", "http://x/invite/abc");

        verify(sender, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    void withoutDevLogOrSmtpTheServiceReportsItselfUnconfigured() {
        EmailServiceImpl service = new EmailServiceImpl(null, "", false, environment("dev"), messages());

        assertThat(service.isConfigured()).isFalse();
    }

    @Test
    void withSmtpAndNoDevLogTheMessageIsReallySent() {
        SimpleMailMessage message = sentWhenRequestLanguageIs(Locale.forLanguageTag("vi"), s -> s.sendRegistrationOtp("to@x.test", "654321"));

        assertThat(message.getTo()).containsExactly("to@x.test");
        assertThat(message.getText()).contains("654321");
    }

    @Test
    void anEnglishRequestGetsAnEnglishEmail() {
        SimpleMailMessage message = sentWhenRequestLanguageIs(Locale.ENGLISH, s -> s.sendPasswordResetOtp("to@x.test", "111222"));

        assertThat(message.getSubject()).isEqualTo("Your Orbit password reset code");
        assertThat(message.getText()).contains("Your code is: 111222").contains("valid for 10 minutes");
    }

    @Test
    void aVietnameseRequestGetsAVietnameseEmail() {
        SimpleMailMessage message = sentWhenRequestLanguageIs(Locale.forLanguageTag("vi"), s -> s.sendPasswordResetOtp("to@x.test", "111222"));

        assertThat(message.getSubject()).isEqualTo("Mã OTP khôi phục mật khẩu");
        assertThat(message.getText()).contains("Mã OTP của bạn là: 111222");
    }

    @Test
    void aLanguageWithoutTextsGetsVietnameseNotTheLanguageOfTheServer() {
        SimpleMailMessage message = sentWhenRequestLanguageIs(Locale.FRENCH, s -> s.sendRegistrationOtp("to@x.test", "333444"));

        assertThat(message.getSubject()).isEqualTo("Mã xác minh đăng ký Orbit");
    }

    @Test
    void theInvitationNamesTheCompanyTheInviterAndTheLinkInBothLanguages() {
        SimpleMailMessage english = sentWhenRequestLanguageIs(Locale.ENGLISH, s -> s.sendInvitation("to@x.test", "Acme", "Boss", "http://x/invite/abc"));

        assertThat(english.getSubject()).isEqualTo("Invitation to join Acme on Orbit");
        assertThat(english.getText()).contains("Boss invited you to join Acme on Orbit").contains("http://x/invite/abc");
    }

    @Test
    void theEmailChangedNoticeNamesTheNewAddress() {
        SimpleMailMessage message = sentWhenRequestLanguageIs(Locale.ENGLISH, s -> s.sendEmailChangedNotice("old@x.test", "new@x.test"));

        assertThat(message.getTo()).containsExactly("old@x.test");
        assertThat(message.getText()).contains("changed to new@x.test");
    }

    @Test
    void bothLanguageFilesHaveTheSameMessagesWithTheSameArguments() throws IOException {
        Properties vi = load("/messages.properties");
        Properties en = load("/messages_en.properties");

        assertThat(en.stringPropertyNames()).isEqualTo(vi.stringPropertyNames());
        for (String key : vi.stringPropertyNames()) {
            assertThat(arguments(en.getProperty(key))).as(key).isEqualTo(arguments(vi.getProperty(key)));
        }
    }

    private static Properties load(String resource) throws IOException {
        Properties properties = new Properties();
        try (InputStreamReader reader = new InputStreamReader(
                EmailServiceImplTest.class.getResourceAsStream(resource), StandardCharsets.UTF_8)) {
            properties.load(reader);
        }
        return properties;
    }

    private static java.util.Set<String> arguments(String message) {
        java.util.Set<String> found = new java.util.TreeSet<>();
        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("\\{(\\d+)}").matcher(message);
        while (matcher.find()) {
            found.add(matcher.group(1));
        }
        return found;
    }
}
