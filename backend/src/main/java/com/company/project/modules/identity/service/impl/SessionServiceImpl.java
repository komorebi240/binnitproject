package com.company.project.modules.identity.service.impl;

import com.company.project.modules.identity.domain.AuthSessionEntity;
import com.company.project.modules.identity.repository.AuthSessionRepository;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.identity.service.SessionService;
import com.company.project.security.SessionProperties;
import com.company.project.security.UserPrincipal;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

@Service
public class SessionServiceImpl implements SessionService {

    private static final int TOKEN_BYTES = 32;
    /** Activity is written at most this often per session, however often the browser reports it. */
    private static final Duration ACTIVITY_WRITE_INTERVAL = Duration.ofMinutes(1);

    private final AuthSessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final CustomUserDetailsService userDetailsService;
    private final SessionProperties properties;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public SessionServiceImpl(
            AuthSessionRepository sessionRepository,
            UserRepository userRepository,
            CustomUserDetailsService userDetailsService,
            SessionProperties properties,
            Clock clock
    ) {
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
        this.userDetailsService = userDetailsService;
        this.properties = properties;
        this.clock = clock;
    }

    @Override
    @Transactional
    public String start(Long userId) {
        Instant now = clock.instant();
        // Sessions that can never be used again would otherwise pile up: sweep this person's on every sign-in.
        sessionRepository.deleteDeadByUserId(userId, now, now.minus(idleTimeout()));

        String token = newToken();
        sessionRepository.save(new AuthSessionEntity(userId, hash(token), now, now.plus(Duration.ofDays(properties.maxAgeDays()))));
        return token;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UserPrincipal> resume(String token) {
        return findAlive(token, clock.instant())
                .flatMap(session -> userRepository.findActiveById(session.getUserId()))
                .flatMap(user -> {
                    try {
                        return Optional.of(userDetailsService.toPrincipal(user));
                    } catch (UsernameNotFoundException noActivePosition) {
                        return Optional.empty();
                    }
                })
                .filter(UserPrincipal::isEnabled);
    }

    @Override
    @Transactional
    public boolean recordActivity(String token) {
        Instant now = clock.instant();
        Optional<AuthSessionEntity> session = findAlive(token, now);
        session.filter(s -> now.isAfter(s.getLastActivityAt().plus(ACTIVITY_WRITE_INTERVAL)))
                .ifPresent(s -> s.recordActivity(now));
        return session.isPresent();
    }

    @Override
    @Transactional
    public void end(String token) {
        if (token != null && !token.isBlank()) {
            sessionRepository.deleteByTokenHash(hash(token));
        }
    }

    @Override
    @Transactional
    public void endAll(Long userId) {
        sessionRepository.deleteAllByUserId(userId);
    }

    @Override
    @Transactional
    public void endOthers(Long userId, String keepToken) {
        if (keepToken == null || keepToken.isBlank()) {
            sessionRepository.deleteAllByUserId(userId);
        } else {
            sessionRepository.deleteOthersByUserId(userId, hash(keepToken));
        }
    }

    private Optional<AuthSessionEntity> findAlive(String token, Instant now) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        return sessionRepository.findByTokenHash(hash(token)).filter(s -> s.isAlive(now, idleTimeout()));
    }

    private Duration idleTimeout() {
        return Duration.ofMinutes(properties.idleTimeoutMinutes());
    }

    private String newToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is required by the Java platform", e);
        }
    }
}
