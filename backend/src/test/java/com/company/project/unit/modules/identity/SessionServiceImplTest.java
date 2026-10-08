package com.company.project.unit.modules.identity;

import com.company.project.common.AuthorityLevel;
import com.company.project.modules.identity.domain.AuthSessionEntity;
import com.company.project.modules.identity.domain.PositionEntity;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.repository.AuthSessionRepository;
import com.company.project.modules.identity.repository.PositionRepository;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.identity.service.impl.CustomUserDetailsService;
import com.company.project.modules.identity.service.impl.SessionServiceImpl;
import com.company.project.security.SessionProperties;
import com.company.project.security.UserPrincipal;
import com.company.project.unit.support.MutableClock;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** The rules of a sign-in: two hours without action ends it, seven days ends it whatever happens, and ending is immediate. */
class SessionServiceImplTest {

    private static final Instant START = Instant.parse("2026-10-08T08:00:00Z");
    private static final Long USER_ID = 7L;
    private static final String TOKEN = "token-held-by-the-browser";

    private final AuthSessionRepository sessions = mock(AuthSessionRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final PositionRepository positions = mock(PositionRepository.class);
    private MutableClock clock;
    private SessionServiceImpl service;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(START);
        service = new SessionServiceImpl(
                sessions, users, new CustomUserDetailsService(users, positions), new SessionProperties(120, 7), clock);
    }

    private static String sha256Hex(String value) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    }

    private AuthSessionEntity liveSession() throws Exception {
        AuthSessionEntity session = new AuthSessionEntity(USER_ID, sha256Hex(TOKEN), START, START.plus(Duration.ofDays(7)));
        when(sessions.findByTokenHash(sha256Hex(TOKEN))).thenReturn(Optional.of(session));
        return session;
    }

    private UserEntity user(boolean active) throws Exception {
        UserEntity user = new UserEntity(1L, "member", "hash", "Member", "member@example.com");
        Field id = UserEntity.class.getDeclaredField("id");
        id.setAccessible(true);
        id.set(user, USER_ID);
        user.setActive(active);
        when(users.findActiveById(USER_ID)).thenReturn(Optional.of(user));
        when(positions.findActiveByUserId(USER_ID))
                .thenReturn(Optional.of(new PositionEntity(USER_ID, AuthorityLevel.EMPLOYEE, 10L, null, null)));
        return user;
    }

    // ---- start

    @Test
    void start_returnsAFreshRandomTokenEachTimeAndStoresRowsForTheUser() {
        String first = service.start(USER_ID);
        String second = service.start(USER_ID);

        assertThat(first).isNotEqualTo(second).hasSizeGreaterThanOrEqualTo(40);
        ArgumentCaptor<AuthSessionEntity> saved = ArgumentCaptor.forClass(AuthSessionEntity.class);
        verify(sessions, times(2)).save(saved.capture());
        AuthSessionEntity row = saved.getAllValues().get(0);
        assertThat(row.getUserId()).isEqualTo(USER_ID);
        assertThat(row.getLastActivityAt()).isEqualTo(START);
        assertThat(row.getExpiresAt()).isEqualTo(START.plus(Duration.ofDays(7)));
    }

    @Test
    void start_storesTheHashNotTheToken() throws Exception {
        // The token handed out finds its session only through the hash, so the table alone is useless as a cookie.
        String token = service.start(USER_ID);
        ArgumentCaptor<AuthSessionEntity> saved = ArgumentCaptor.forClass(AuthSessionEntity.class);
        verify(sessions).save(saved.capture());
        when(sessions.findByTokenHash(sha256Hex(token))).thenReturn(Optional.of(saved.getValue()));
        user(true);

        assertThat(service.resume(token)).isPresent();
        verify(sessions, never()).findByTokenHash(token);
    }

    @Test
    void start_sweepsThisPersonsDeadSessionsFirst() {
        service.start(USER_ID);

        verify(sessions).deleteDeadByUserId(USER_ID, START, START.minus(Duration.ofMinutes(120)));
    }

    // ---- resume

    @Test
    void resume_liveSessionGivesThePersonReadFreshFromTheDatabase() throws Exception {
        liveSession();
        user(true);

        Optional<UserPrincipal> principal = service.resume(TOKEN);

        assertThat(principal).isPresent();
        assertThat(principal.get().getUserId()).isEqualTo(USER_ID);
        assertThat(principal.get().getAuthorityLevel()).isEqualTo(AuthorityLevel.EMPLOYEE);
    }

    @Test
    void resume_unknownBlankOrMissingTokenIsNothing() {
        when(sessions.findByTokenHash(anyString())).thenReturn(Optional.empty());

        assertThat(service.resume("someone-elses-guess")).isEmpty();
        assertThat(service.resume("")).isEmpty();
        assertThat(service.resume(null)).isEmpty();
    }

    @Test
    void resume_endsExactlyAtTheIdleTimeout() throws Exception {
        liveSession();
        user(true);

        clock.advance(Duration.ofMinutes(119));
        assertThat(service.resume(TOKEN)).isPresent();

        clock.advance(Duration.ofMinutes(1));
        assertThat(service.resume(TOKEN)).as("120 minutes without action").isEmpty();
    }

    @Test
    void resume_endsAtTheAbsoluteLimitEvenForSomeoneWhoKeepsWorking() throws Exception {
        AuthSessionEntity session = liveSession();
        user(true);

        // Active every hour for seven days: the idle clock never runs out, the absolute one does.
        for (int hour = 0; hour < 7 * 24 - 1; hour++) {
            clock.advance(Duration.ofHours(1));
            session.recordActivity(clock.instant());
        }
        assertThat(service.resume(TOKEN)).isPresent();

        clock.advance(Duration.ofHours(1));
        session.recordActivity(clock.instant());
        assertThat(service.resume(TOKEN)).as("7 days after sign-in").isEmpty();
    }

    @Test
    void resume_aSwitchedOffAccountCannotContinue() throws Exception {
        liveSession();
        user(false);

        assertThat(service.resume(TOKEN)).isEmpty();
    }

    @Test
    void resume_aPersonWhoLeftTheCompanyCannotContinue() throws Exception {
        liveSession();
        when(users.findActiveById(USER_ID)).thenReturn(Optional.empty());

        assertThat(service.resume(TOKEN)).isEmpty();
    }

    @Test
    void resume_aPersonWithoutAnActivePositionCannotContinue() throws Exception {
        liveSession();
        user(true);
        when(positions.findActiveByUserId(USER_ID)).thenReturn(Optional.empty());

        assertThat(service.resume(TOKEN)).isEmpty();
    }

    // ---- recordActivity

    @Test
    void recordActivity_pushesTheIdleTimeoutBack() throws Exception {
        AuthSessionEntity session = liveSession();
        user(true);

        clock.advance(Duration.ofMinutes(100));
        assertThat(service.recordActivity(TOKEN)).isTrue();
        clock.advance(Duration.ofMinutes(100));

        assertThat(session.getLastActivityAt()).isEqualTo(START.plus(Duration.ofMinutes(100)));
        assertThat(service.resume(TOKEN)).as("100 minutes after the last action").isPresent();
    }

    @Test
    void recordActivity_reportsFalseOnceTheSessionIsDead() throws Exception {
        liveSession();

        clock.advance(Duration.ofMinutes(121));

        assertThat(service.recordActivity(TOKEN)).isFalse();
        assertThat(service.recordActivity("unknown")).isFalse();
        assertThat(service.recordActivity(null)).isFalse();
    }

    @Test
    void recordActivity_writesAtMostOncePerMinute() throws Exception {
        AuthSessionEntity session = liveSession();

        clock.advance(Duration.ofSeconds(30));
        assertThat(service.recordActivity(TOKEN)).isTrue();
        assertThat(session.getLastActivityAt()).as("too soon after the last write").isEqualTo(START);

        clock.advance(Duration.ofSeconds(31));
        service.recordActivity(TOKEN);
        assertThat(session.getLastActivityAt()).isEqualTo(clock.instant());
    }

    // ---- ending

    @Test
    void end_removesOnlyThatSessionAndIgnoresBlankTokens() throws Exception {
        service.end(TOKEN);
        service.end("");
        service.end(null);

        verify(sessions).deleteByTokenHash(sha256Hex(TOKEN));
        verify(sessions, times(1)).deleteByTokenHash(any());
    }

    @Test
    void endAll_removesEverySessionOfThePerson() {
        service.endAll(USER_ID);

        verify(sessions).deleteAllByUserId(USER_ID);
    }

    @Test
    void endOthers_keepsTheCurrentBrowserOrEndsAllWhenThereIsNone() throws Exception {
        service.endOthers(USER_ID, TOKEN);
        verify(sessions).deleteOthersByUserId(eq(USER_ID), eq(sha256Hex(TOKEN)));

        service.endOthers(USER_ID, null);
        service.endOthers(USER_ID, " ");
        verify(sessions, times(2)).deleteAllByUserId(USER_ID);
        verify(sessions, times(1)).deleteOthersByUserId(anyLong(), anyString());
    }
}
