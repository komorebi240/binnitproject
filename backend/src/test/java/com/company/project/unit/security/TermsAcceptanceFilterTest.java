package com.company.project.unit.security;

import com.company.project.common.AuthorityLevel;
import com.company.project.modules.legal.service.TermsService;
import com.company.project.security.TermsAcceptanceFilter;
import com.company.project.security.UserPrincipal;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** The terms gate lives on the server: skipping the frontend window does not skip the terms. */
class TermsAcceptanceFilterTest {

    private TermsService termsService;
    private TermsAcceptanceFilter filter;

    @BeforeEach
    void setUp() {
        termsService = mock(TermsService.class);
        filter = new TermsAcceptanceFilter(termsService, new ObjectMapper().findAndRegisterModules());
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private void signIn(long userId) {
        UserPrincipal principal = new UserPrincipal(userId, "u", null, 1L, AuthorityLevel.EMPLOYEE, null, null, true);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private MockHttpServletResponse call(String method, String path) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(request, response, chain);
        return response;
    }

    private static boolean passedThrough(MockHttpServletResponse response) throws Exception {
        return response.getStatus() == 200 && response.getContentAsString().isEmpty();
    }

    @Test
    void aUserWhoHasNotAcceptedIsBlockedFromEveryOtherEndpoint() throws Exception {
        signIn(7L);
        when(termsService.hasAcceptedCurrent(7L)).thenReturn(false);

        MockHttpServletResponse response = call("GET", "/api/v1/tasks");

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("TERMS_NOT_ACCEPTED").contains("\"success\":false");
    }

    @Test
    void aUserWhoHasAcceptedPassesThrough() throws Exception {
        signIn(7L);
        when(termsService.hasAcceptedCurrent(7L)).thenReturn(true);

        assertThat(passedThrough(call("GET", "/api/v1/tasks"))).isTrue();
    }

    @Test
    void signingInAndOutWhoAmIAndTheTermsThemselvesStayReachable() throws Exception {
        signIn(7L);
        when(termsService.hasAcceptedCurrent(7L)).thenReturn(false);

        assertThat(passedThrough(call("GET", "/api/v1/auth/me"))).isTrue();
        assertThat(passedThrough(call("POST", "/api/v1/auth/logout"))).isTrue();
        assertThat(passedThrough(call("POST", "/api/v1/terms/accept"))).isTrue();
        assertThat(passedThrough(call("GET", "/api/v1/terms/current"))).isTrue();
        assertThat(passedThrough(call("OPTIONS", "/api/v1/tasks"))).isTrue();
    }

    @Test
    void anAnonymousRequestIsLeftToTheNormalAuthenticationRules() throws Exception {
        assertThat(passedThrough(call("GET", "/api/v1/tasks"))).isTrue();
        verifyNoInteractions(termsService);
    }
}
