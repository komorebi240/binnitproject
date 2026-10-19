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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** What the two cookies of a sign-in look like on the wire, and that signing out also ends the session on the server. */
class SessionCookiesTest {

    private static final UserPrincipal MEMBER =
            new UserPrincipal(7L, "member", null, 1L, AuthorityLevel.EMPLOYEE, 10L, null, true);

    private final SessionService sessionService = mock(SessionService.class);
    private SessionCookies sessionCookies;

    @BeforeEach
    void setUp() {
        JwtService jwtService = new JwtService(new JwtProperties("a-test-secret-that-is-comfortably-longer-than-32-bytes", 15, true));
        sessionCookies = new SessionCookies(jwtService, sessionService, new SessionProperties(120, 7));
    }

    @Test
    void signIn_startsASessionAndSetsBothCookiesHttpOnlyAndSecure() {
        when(sessionService.start(7L)).thenReturn("session-token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        sessionCookies.signIn(response, MEMBER);

        assertThat(response.getHeaders("Set-Cookie")).hasSize(2);
        String access = response.getHeaders("Set-Cookie").stream()
                .filter(h -> h.startsWith(JwtAuthenticationFilter.ACCESS_TOKEN_COOKIE + "=")).findFirst().orElseThrow();
        String session = response.getHeaders("Set-Cookie").stream()
                .filter(h -> h.startsWith(SessionCookies.SESSION_COOKIE + "=")).findFirst().orElseThrow();
        assertThat(access).contains("Max-Age=900");
        assertThat(session).startsWith(SessionCookies.SESSION_COOKIE + "=session-token;").contains("Max-Age=" + 7 * 24 * 3600);
        assertThat(access).contains("HttpOnly").contains("Secure").contains("SameSite=Lax").contains("Path=/");
        assertThat(session).contains("HttpOnly").contains("Secure").contains("SameSite=Lax").contains("Path=/");
    }

    @Test
    void bothCookiesMeetTheHostPrefixRules_soNoOtherSubdomainCanSetThem() {
        when(sessionService.start(7L)).thenReturn("session-token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        sessionCookies.signIn(response, MEMBER);

        // A browser accepts a __Host- cookie only with Secure, Path=/ and no Domain attribute.
        assertThat(JwtAuthenticationFilter.ACCESS_TOKEN_COOKIE).startsWith("__Host-");
        assertThat(SessionCookies.SESSION_COOKIE).startsWith("__Host-");
        assertThat(response.getHeaders("Set-Cookie")).hasSize(2).allSatisfy(header -> {
            assertThat(header).startsWith("__Host-").contains("Secure").contains("Path=/");
            assertThat(header.toLowerCase()).doesNotContain("domain=");
        });
    }

    @Test
    void signOut_endsTheSessionOnTheServerAndClearsBothCookies() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie(SessionCookies.SESSION_COOKIE, "session-token"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        sessionCookies.signOut(request, response);

        verify(sessionService).end("session-token");
        assertThat(response.getHeaders("Set-Cookie")).hasSize(2).allSatisfy(h -> assertThat(h).contains("Max-Age=0"));
    }

    @Test
    void signOut_worksWithoutAnyCookie() {
        MockHttpServletResponse response = new MockHttpServletResponse();

        sessionCookies.signOut(new MockHttpServletRequest(), response);

        verify(sessionService).end(null);
        assertThat(response.getHeaders("Set-Cookie")).hasSize(2);
    }
}
