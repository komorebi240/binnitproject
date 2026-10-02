package com.company.project.security;

import com.company.project.common.AuthorityLevel;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

/**
 * Issues access tokens carrying enough claims (company/authority/department/team) to build a
 * full {@link UserPrincipal} without a database round trip on every request. Trade-off: if a
 * user's position changes, their existing token keeps the old claims until it expires
 * (accessTokenTtlMinutes) - acceptable for Phase 1, revisit if that staleness window matters.
 *
 * Refresh-token persistence/rotation are deliberately not implemented - a REVIEW/CRITICAL
 * decision (CLAUDE.md section 8) for a later phase.
 */
@Service
@EnableConfigurationProperties(JwtProperties.class)
public class JwtService {

    private static final String CLAIM_COMPANY_ID = "companyId";
    private static final String CLAIM_AUTHORITY = "authority";
    private static final String CLAIM_DEPARTMENT_ID = "departmentId";
    private static final String CLAIM_TEAM_ID = "teamId";
    private static final String CLAIM_USERNAME = "username";
    private static final String CLAIM_SYSTEM_ACCOUNT = "systemAccount";

    private final JwtProperties properties;
    private final SecretKey key;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        this.key = Keys.hmacShaKeyFor(properties.secret().getBytes());
    }

    public long accessTokenTtlSeconds() {
        return properties.accessTokenTtlMinutes() * 60;
    }

    public String generateAccessToken(UserPrincipal principal) {
        Instant now = Instant.now();
        var builder = Jwts.builder()
                .subject(String.valueOf(principal.getUserId()))
                .claim(CLAIM_USERNAME, principal.getUsername())
                .claim(CLAIM_COMPANY_ID, String.valueOf(principal.getCompanyId()))
                .claim(CLAIM_AUTHORITY, principal.getAuthorityLevel().name())
                .claim(CLAIM_SYSTEM_ACCOUNT, principal.isSystemAccount())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(properties.accessTokenTtlMinutes(), ChronoUnit.MINUTES)))
                .signWith(key);

        if (principal.getDepartmentId() != null) {
            builder.claim(CLAIM_DEPARTMENT_ID, String.valueOf(principal.getDepartmentId()));
        }
        if (principal.getTeamId() != null) {
            builder.claim(CLAIM_TEAM_ID, String.valueOf(principal.getTeamId()));
        }

        return builder.compact();
    }

    /** Rebuilds the principal from a token's claims. Returns null for any invalid/expired token. */
    public UserPrincipal parsePrincipal(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();

            Long departmentId = parseNullableLong(claims.get(CLAIM_DEPARTMENT_ID, String.class));
            Long teamId = parseNullableLong(claims.get(CLAIM_TEAM_ID, String.class));

            Boolean systemAccount = claims.get(CLAIM_SYSTEM_ACCOUNT, Boolean.class);
            return new UserPrincipal(
                    Long.valueOf(claims.getSubject()),
                    claims.get(CLAIM_USERNAME, String.class),
                    null,
                    Long.valueOf(claims.get(CLAIM_COMPANY_ID, String.class)),
                    AuthorityLevel.valueOf(claims.get(CLAIM_AUTHORITY, String.class)),
                    departmentId,
                    teamId,
                    true,
                    Boolean.TRUE.equals(systemAccount)
            );
        } catch (JwtException | IllegalArgumentException ex) {
            return null;
        }
    }

    private static Long parseNullableLong(String value) {
        return value == null ? null : Long.valueOf(value);
    }
}
