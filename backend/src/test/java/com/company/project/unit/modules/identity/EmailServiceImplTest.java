package com.company.project.unit.modules.identity;

import com.company.project.modules.identity.service.impl.EmailServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class EmailServiceImplTest {

    private static MockEnvironment environment(String... profiles) {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles(profiles);
        return env;
    }

    @Test
    void devLogMustNeverBeEnabledUnderTheProdProfile() {
        assertThatThrownBy(() -> new EmailServiceImpl(null, "", true, environment("prod")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("prod");
    }

    @Test
    void devLogWorksWithoutSmtpAndNeverCallsTheMailSender() {
        JavaMailSender sender = mock(JavaMailSender.class);
        EmailServiceImpl service = new EmailServiceImpl(sender, "", true, environment("dev"));

        assertThat(service.isConfigured()).isTrue();
        service.sendRegistrationOtp("a@b.test", "123456");
        service.sendInvitation("a@b.test", "Acme", "Boss", "http://x/invite/abc");

        verify(sender, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    void withoutDevLogOrSmtpTheServiceReportsItselfUnconfigured() {
        EmailServiceImpl service = new EmailServiceImpl(null, "", false, environment("dev"));

        assertThat(service.isConfigured()).isFalse();
    }

    @Test
    void withSmtpAndNoDevLogTheMessageIsReallySent() {
        JavaMailSender sender = mock(JavaMailSender.class);
        EmailServiceImpl service = new EmailServiceImpl(sender, "from@x.test", false, environment("prod"));

        service.sendRegistrationOtp("to@x.test", "654321");

        verify(sender).send(any(SimpleMailMessage.class));
    }
}
