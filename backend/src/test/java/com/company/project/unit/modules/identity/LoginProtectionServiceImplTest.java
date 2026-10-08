package com.company.project.unit.modules.identity;

import com.company.project.common.RateLimiter;
import com.company.project.common.exception.BusinessException;
import com.company.project.modules.identity.domain.LoginFailureEntity;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.repository.LoginFailureRepository;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.identity.service.impl.LoginProtectionServiceImpl;
import com.company.project.unit.support.MutableClock;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.lang.reflect.Field;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static com.company.project.modules.identity.service.impl.LoginProtectionServiceImpl.MAX_FAILURES_PER_ADDRESS;
import static com.company.project.modules.identity.service.impl.LoginProtectionServiceImpl.MAX_FAILURES_PER_USERNAME;
import static com.company.project.modules.identity.service.impl.LoginProtectionServiceImpl.WINDOW;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Brute-force protection for sign-in (security handoff finding #1). The database table is simulated by a map so the test can
 * also play "the application restarted": a new RateLimiter with the same stored failures.
 */
class LoginProtectionServiceImplTest {

    private static final String ADDRESS = "203.0.113.7";
    private static final String OTHER_ADDRESS = "198.51.100.9";

    private final UserRepository users = mock(UserRepository.class);
    private final LoginFailureRepository failures = mock(LoginFailureRepository.class);
    private final Map<Long, LoginFailureEntity> table = new HashMap<>();
    private MutableClock clock;
    private LoginProtectionServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        clock = new MutableClock(Instant.parse("2026-10-08T08:00:00Z"));
        service = new LoginProtectionServiceImpl(new RateLimiter(clock), users, failures, clock);

        UserEntity alice = user(1L, "alice");
        UserEntity bob = user(2L, "bob");
        when(users.findByUsername(anyString())).thenReturn(Optional.empty());
        when(users.findActiveByUsernameForUpdate(anyString())).thenReturn(Optional.empty());
        for (UserEntity user : new UserEntity[] {alice, bob}) {
            when(users.findByUsername(user.getUsername())).thenReturn(Optional.of(user));
            when(users.findActiveByUsernameForUpdate(user.getUsername())).thenReturn(Optional.of(user));
        }
        when(failures.findById(anyLong())).thenAnswer(call -> Optional.ofNullable(table.get(call.<Long>getArgument(0))));
        when(failures.save(any(LoginFailureEntity.class))).thenAnswer(call -> {
            LoginFailureEntity row = call.getArgument(0);
            Field userId = LoginFailureEntity.class.getDeclaredField("userId");
            userId.setAccessible(true);
            table.put((Long) userId.get(row), row);
            return row;
        });
        when(failures.deleteByUserId(anyLong())).thenAnswer(call -> table.remove(call.<Long>getArgument(0)) == null ? 0 : 1);
    }

    private static UserEntity user(long id, String username) throws Exception {
        UserEntity user = new UserEntity(1L, username, "hash", username, null);
        Field field = UserEntity.class.getDeclaredField("id");
        field.setAccessible(true);
        field.set(user, id);
        return user;
    }

    private void fail(String username, String address, int times) {
        for (int i = 0; i < times; i++) {
            service.recordFailure(username, address);
        }
    }

    private static void assertBlocked(Runnable attempt) {
        assertThatThrownBy(attempt::run)
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    assertThat(e.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
                    assertThat(e.getCode()).isEqualTo("TOO_MANY_REQUESTS");
                    assertThat(e.getMessage()).isEqualTo("Too many attempts. Please try again later.");
                });
    }

    @Test
    void wrongPasswordUpToTheLimitIsStillAllowedThenTheNextAttemptIs429() {
        fail("alice", ADDRESS, MAX_FAILURES_PER_USERNAME - 1);
        assertThatCode(() -> service.checkAllowed("alice", ADDRESS)).doesNotThrowAnyException();

        fail("alice", ADDRESS, 1);
        assertBlocked(() -> service.checkAllowed("alice", ADDRESS));
    }

    @Test
    void anUnknownUsernameGetsExactlyTheSameAnswer_noEnumeration() {
        fail("nobody-by-this-name", ADDRESS, MAX_FAILURES_PER_USERNAME - 1);
        assertThatCode(() -> service.checkAllowed("nobody-by-this-name", ADDRESS)).doesNotThrowAnyException();

        fail("nobody-by-this-name", ADDRESS, 1);
        assertBlocked(() -> service.checkAllowed("nobody-by-this-name", ADDRESS));
        assertThat(table).as("nothing is stored for a name that is not an account").isEmpty();
    }

    @Test
    void theUsernameIsCountedWhateverItsCapitalisation() {
        fail("Alice", ADDRESS, 2);
        fail("ALICE ", ADDRESS, 2);
        fail("alice", ADDRESS, 1);

        assertBlocked(() -> service.checkAllowed("aLiCe", ADDRESS));
    }

    @Test
    void afterTheWindowThePersonMayTryAgain() {
        fail("alice", ADDRESS, MAX_FAILURES_PER_USERNAME);
        assertBlocked(() -> service.checkAllowed("alice", ADDRESS));

        clock.advance(WINDOW.plusSeconds(1));

        assertThatCode(() -> service.checkAllowed("alice", ADDRESS)).doesNotThrowAnyException();
    }

    @Test
    void oneUsernameBeingBlockedDoesNotBlockAnother() {
        fail("alice", OTHER_ADDRESS, MAX_FAILURES_PER_USERNAME);

        assertBlocked(() -> service.checkAllowed("alice", ADDRESS));
        assertThatCode(() -> service.checkAllowed("bob", ADDRESS)).doesNotThrowAnyException();
    }

    @Test
    void sprayingManyUsernamesFromOneAddressBlocksThatAddressOnly() {
        for (int i = 0; i < MAX_FAILURES_PER_ADDRESS; i++) {
            service.recordFailure("guess-" + i, ADDRESS);
        }

        assertBlocked(() -> service.checkAllowed("bob", ADDRESS));
        assertThatCode(() -> service.checkAllowed("bob", OTHER_ADDRESS)).doesNotThrowAnyException();
    }

    @Test
    void aSuccessfulSignInClearsTheUsernameButNotTheAddress() {
        fail("alice", ADDRESS, MAX_FAILURES_PER_USERNAME - 1);
        for (int i = 0; i < MAX_FAILURES_PER_ADDRESS - MAX_FAILURES_PER_USERNAME; i++) {
            service.recordFailure("guess-" + i, ADDRESS);
        }

        service.clearFailures("alice");

        assertThat(table).doesNotContainKey(1L);
        fail("alice", OTHER_ADDRESS, MAX_FAILURES_PER_USERNAME - 1);
        assertThatCode(() -> service.checkAllowed("alice", OTHER_ADDRESS)).as("count started again").doesNotThrowAnyException();
        // One more failure from the address that sprayed: it has now used its whole allowance.
        service.recordFailure("someone", ADDRESS);
        assertBlocked(() -> service.checkAllowed("bob", ADDRESS));
    }

    @Test
    void failuresOfARealAccountSurviveARestart() {
        fail("alice", ADDRESS, MAX_FAILURES_PER_USERNAME);
        assertThat(table.get(1L).getFailureCount()).isEqualTo(MAX_FAILURES_PER_USERNAME);

        // A restart empties memory; the database still holds alice's failures.
        LoginProtectionServiceImpl afterRestart = new LoginProtectionServiceImpl(new RateLimiter(clock), users, failures, clock);

        assertBlocked(() -> afterRestart.checkAllowed("alice", ADDRESS));
        clock.advance(WINDOW);
        assertThatCode(() -> afterRestart.checkAllowed("alice", ADDRESS)).doesNotThrowAnyException();
    }

    @Test
    void aFailureAfterTheWindowStartsANewCount() {
        fail("alice", ADDRESS, MAX_FAILURES_PER_USERNAME - 1);
        clock.advance(WINDOW.plus(Duration.ofMinutes(1)));

        service.recordFailure("alice", ADDRESS);

        assertThat(table.get(1L).getFailureCount()).isEqualTo(1);
    }
}
