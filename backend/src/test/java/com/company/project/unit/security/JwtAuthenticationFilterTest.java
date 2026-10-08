package com.company.project.unit.security;

import com.company.project.common.AuthorityLevel;
import com.company.project.modules.identity.service.SessionService;
import com.company.project.security.JwtAuthenticationFilter;
import com.company.project.security.JwtProperties;
import com.company.project.security.JwtService;
import com.company.project.security.SessionCookies;
import com.company.project.security.SessionProperties;
import com.company.project.security.UserPrincipal;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** A sign-in outlives its 15-minute access token only through a live server-side session - and never through anything else. */
class JwtAuthenticationFilterTest {

    private static final String SECRET = "a-test-secret-that-is-comfortably-longer-than-32-bytes";
    private static final UserPrincipal MEMBER =
            new UserPrincipal(7L, "member", null, 1L, AuthorityLevel.EMPLOYEE, 10L, null, true);

    private final SessionService sessionService = mock(SessionService.class);
    private JwtService jwtService;
    private SessionCookies sessionCookies;
    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(new JwtProperties(SECRET, 15, true));
        sessionCookies = new SessionCookies(jwtService, sessionService, new SessionProperties(120, 7));
        filter = new JwtAuthenticationFilter(jwtService, sessionService, sessionCookies);
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private MockHttpServletResponse run(Cookie... cookies) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/tasks");
        request.setCookies(cookies);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        return response;
    }

    private static UserPrincipal authenticated() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication == null ? null : (UserPrincipal) authentication.getPrincipal();
    }

    private Cookie expiredAccessToken() {
        JwtService past = new JwtService(new JwtProperties(SECRET, -1, true));
        return new Cookie(JwtAuthenticationFilter.ACCESS_TOKEN_COOKIE, past.generateAccessToken(MEMBER));
    }

    @Test
    void validAccessToken_authenticatesWithoutLookingAtTheSession() throws Exception {
        MockHttpServletResponse response = run(
                new Cookie(JwtAuthenticationFilter.ACCESS_TOKEN_COOKIE, jwtService.generateAccessToken(MEMBER)),
                new Cookie(SessionCookies.SESSION_COOKIE, "token"));

        assertThat(authenticated().getUserId()).isEqualTo(7L);
        assertThat(response.getHeaders("Set-Cookie")).isEmpty();
        verifyNoInteractions(sessionService);
    }

    @Test
    void expiredAccessTokenWithLiveSession_authenticatesAndIssuesAFreshAccessToken() throws Exception {
        when(sessionService.resume("token")).thenReturn(Optional.of(MEMBER));

        MockHttpServletResponse response = run(expiredAccessToken(), new Cookie(SessionCookies.SESSION_COOKIE, "token"));

        assertThat(authenticated().getUserId()).isEqualTo(7L);
        assertThat(response.getHeaders("Set-Cookie")).singleElement().satisfies(header -> {
            assertThat(header).startsWith(JwtAuthenticationFilter.ACCESS_TOKEN_COOKIE + "=");
            assertThat(header).contains("HttpOnly").contains("Secure").contains("SameSite=Lax").contains("Max-Age=900");
        });
        // The fresh token carries the claims read from the database just now.
        String fresh = response.getHeaders("Set-Cookie").get(0).split(";")[0].substring((JwtAuthenticationFilter.ACCESS_TOKEN_COOKIE + "=").length());
        assertThat(jwtService.parsePrincipal(fresh).getUserId()).isEqualTo(7L);
    }

    @Test
    void missingAccessTokenWithLiveSession_alsoResumes() throws Exception {
        when(sessionService.resume("token")).thenReturn(Optional.of(MEMBER));

        run(new Cookie(SessionCookies.SESSION_COOKIE, "token"));

        assertThat(authenticated().getUserId()).isEqualTo(7L);
    }

    @Test
    void forgedAccessToken_isNotTrustedAndFallsBackToTheSession() throws Exception {
        when(sessionService.resume("token")).thenReturn(Optional.empty());

        MockHttpServletResponse response = run(
                new Cookie(JwtAuthenticationFilter.ACCESS_TOKEN_COOKIE, "not.a.token"),
                new Cookie(SessionCookies.SESSION_COOKIE, "token"));

        assertThat(authenticated()).isNull();
        assertThat(response.getHeaders("Set-Cookie")).hasSize(1);
    }

    @Test
    void deadSession_authenticatesNobodyAndTellsTheBrowserToDropIt() throws Exception {
        when(sessionService.resume("stale")).thenReturn(Optional.empty());

        MockHttpServletResponse response = run(expiredAccessToken(), new Cookie(SessionCookies.SESSION_COOKIE, "stale"));

        assertThat(authenticated()).isNull();
        assertThat(response.getHeaders("Set-Cookie")).singleElement().satisfies(header -> {
            assertThat(header).startsWith(SessionCookies.SESSION_COOKIE + "=;");
            assertThat(header).contains("Max-Age=0");
        });
    }

    @Test
    void noCookies_isAnonymousAndCostsNoLookup() throws Exception {
        MockHttpServletResponse response = run();

        assertThat(authenticated()).isNull();
        assertThat(response.getHeaders("Set-Cookie")).isEmpty();
        verifyNoInteractions(sessionService);
    }
}
