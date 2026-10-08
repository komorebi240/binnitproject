package com.company.project.modules.identity.service.impl;

import com.company.project.common.RateLimitGuard;
import com.company.project.common.RateLimiter;
import com.company.project.modules.identity.domain.LoginFailureEntity;
import com.company.project.modules.identity.repository.LoginFailureRepository;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.identity.service.LoginProtectionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;

@Service
public class LoginProtectionServiceImpl implements LoginProtectionService {

    /** Failed passwords allowed per username in the window - the same for names that exist and names that do not. */
    public static final int MAX_FAILURES_PER_USERNAME = 5;
    /** Failed passwords allowed per client address in the window, across all usernames (password spraying). */
    public static final int MAX_FAILURES_PER_ADDRESS = 30;
    public static final Duration WINDOW = Duration.ofMinutes(15);

    private final RateLimiter rateLimiter;
    private final UserRepository userRepository;
    private final LoginFailureRepository loginFailureRepository;
    private final Clock clock;

    public LoginProtectionServiceImpl(
            RateLimiter rateLimiter, UserRepository userRepository, LoginFailureRepository loginFailureRepository, Clock clock) {
        this.rateLimiter = rateLimiter;
        this.userRepository = userRepository;
        this.loginFailureRepository = loginFailureRepository;
        this.clock = clock;
    }

    @Override
    @Transactional(readOnly = true)
    public void checkAllowed(String username, String clientAddress) {
        Instant now = clock.instant();
        boolean blocked = rateLimiter.isExhausted(addressKey(clientAddress), MAX_FAILURES_PER_ADDRESS, WINDOW)
                || rateLimiter.isExhausted(usernameKey(username), MAX_FAILURES_PER_USERNAME, WINDOW)
                || userRepository.findByUsername(username)
                        .filter(user -> !user.isDeleted())
                        .flatMap(user -> loginFailureRepository.findById(user.getId()))
                        .map(failures -> failures.isBlocked(now, MAX_FAILURES_PER_USERNAME, WINDOW))
                        .orElse(false);
        if (blocked) {
            throw RateLimitGuard.tooManyRequests();
        }
    }

    @Override
    @Transactional
    public void recordFailure(String username, String clientAddress) {
        rateLimiter.record(addressKey(clientAddress));
        rateLimiter.record(usernameKey(username));

        Instant now = clock.instant();
        // The row lock on the user serialises concurrent failures of one account, so none is lost.
        userRepository.findActiveByUsernameForUpdate(username).ifPresent(user ->
                loginFailureRepository.findById(user.getId()).ifPresentOrElse(
                        failures -> failures.registerFailure(now, WINDOW),
                        () -> loginFailureRepository.save(new LoginFailureEntity(user.getId(), now))));
    }

    @Override
    @Transactional
    public void clearFailures(String username) {
        rateLimiter.clear(usernameKey(username));
        userRepository.findByUsername(username).ifPresent(user -> loginFailureRepository.deleteByUserId(user.getId()));
    }

    /** Usernames are matched case-insensitively by the database, so "Admin" and "admin" must share one allowance. */
    private static String usernameKey(String username) {
        return "login-fail:user:" + (username == null ? "" : username.strip().toLowerCase(Locale.ROOT));
    }

    private static String addressKey(String clientAddress) {
        return "login-fail:ip:" + clientAddress;
    }
}
