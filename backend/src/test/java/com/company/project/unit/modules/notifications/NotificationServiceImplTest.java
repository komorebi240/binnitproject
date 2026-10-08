package com.company.project.unit.modules.notifications;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.NotificationType;
import com.company.project.modules.notifications.domain.NotificationEntity;
import com.company.project.modules.notifications.dto.response.NotificationResponse;
import com.company.project.modules.notifications.repository.NotificationRepository;
import com.company.project.modules.notifications.service.impl.NotificationServiceImpl;
import com.company.project.security.UserPrincipal;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Limit;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** The values a notification text is built from are stored with it, so a client can word it in the reader's language. */
@ExtendWith(MockitoExtension.class)
class NotificationServiceImplTest {

    @Mock
    private NotificationRepository notificationRepository;

    private NotificationServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new NotificationServiceImpl(notificationRepository, new ObjectMapper());
    }

    private UserPrincipal principal(Long userId) {
        return new UserPrincipal(userId, "caller", null, 1L, AuthorityLevel.EMPLOYEE, null, null, true);
    }

    private NotificationEntity savedBy(Map<String, String> params) {
        service.notify(2L, NotificationType.TASK_ASSIGNED, "title", "body", params, "TASK", 9L);
        ArgumentCaptor<NotificationEntity> captor = ArgumentCaptor.forClass(NotificationEntity.class);
        verify(notificationRepository).save(captor.capture());
        return captor.getValue();
    }

    @Test
    void notify_storesParamsAsJsonNextToTheText() {
        NotificationEntity saved = savedBy(Map.of("actor", "an", "title", "Báo cáo \"Q3\""));

        assertThat(saved.getTitle()).isEqualTo("title");
        assertThat(saved.getBody()).isEqualTo("body");
        assertThat(saved.getParams()).contains("\"actor\":\"an\"").contains("Q3");
    }

    @Test
    void notify_withoutParamsKeepsOnlyTheText() {
        assertThat(savedBy(null).getParams()).isNull();
    }

    @Test
    void notify_dropsParamsThatWouldNotFitTheColumnButStillSendsTheNotification() {
        NotificationEntity saved = savedBy(Map.of("title", "x".repeat(2500)));

        assertThat(saved.getParams()).isNull();
        assertThat(saved.getTitle()).isEqualTo("title");
    }

    @Test
    void listMine_returnsTheStoredParamsAndNullForOlderRows() {
        NotificationEntity withParams = new NotificationEntity(
                1L, NotificationType.TASK_ASSIGNED, "t", "b", "{\"actor\":\"an\",\"title\":\"Việc A\"}", "TASK", 5L);
        NotificationEntity old = new NotificationEntity(1L, NotificationType.TASK_ASSIGNED, "t", "b", null, "TASK", 6L);
        when(notificationRepository.findRecentByUserId(any(), any(Limit.class))).thenReturn(List.of(withParams, old));

        List<NotificationResponse> result = service.listMine(principal(1L));

        assertThat(result.get(0).params()).containsEntry("actor", "an").containsEntry("title", "Việc A");
        assertThat(result.get(1).params()).isNull();
    }

    @Test
    void listMine_unreadableStoredParamsFallBackToTheTextOnly() {
        NotificationEntity broken = new NotificationEntity(
                1L, NotificationType.TASK_ASSIGNED, "t", "b", "{not json", "TASK", 5L);
        when(notificationRepository.findRecentByUserId(any(), any(Limit.class))).thenReturn(List.of(broken));

        assertThat(service.listMine(principal(1L)).get(0).params()).isNull();
    }
}
