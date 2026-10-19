package com.company.project.unit.security;

import com.company.project.config.WebConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.filter.CorsFilter;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * CSRF is disabled (SecurityConfig): cross-site requests never carry the SameSite=Lax session cookies, and this CORS
 * check is what stops a page on a sibling subdomain - which counts as the same site, so its requests do carry them.
 * Browsers always send Origin on a cross-origin POST/PUT/PATCH/DELETE, including plain HTML form posts. Security
 * review finding #4; also verified live (403 for a foreign Origin, directly and through the Next.js proxy).
 */
class CorsCsrfDefenseTest {

    private static final String APP = "https://app.stayorbit.cloud";
    private CorsFilter filter;

    @BeforeEach
    void setUp() {
        WebConfig webConfig = new WebConfig();
        ReflectionTestUtils.setField(webConfig, "allowedOrigins", new String[] {APP});
        filter = new CorsFilter(webConfig.corsConfigurationSource());
    }

    private static final class Outcome {
        int status;
        boolean reachedTheApplication;
    }

    private Outcome post(String origin) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/messages/attachments");
        request.setServerName("localhost");
        request.setServerPort(8080);
        request.setContentType("multipart/form-data; boundary=x");
        if (origin != null) {
            request.addHeader("Origin", origin);
        }
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(request, response, chain);
        Outcome outcome = new Outcome();
        outcome.status = response.getStatus();
        outcome.reachedTheApplication = chain.getRequest() != null;
        return outcome;
    }

    @Test
    void theAppsOwnOriginGoesThrough() throws Exception {
        Outcome outcome = post(APP);

        assertThat(outcome.reachedTheApplication).isTrue();
        assertThat(outcome.status).isEqualTo(200);
    }

    @Test
    void aSiblingSubdomainIsRejectedBeforeTheApplicationSeesTheRequest() throws Exception {
        Outcome outcome = post("https://evil.stayorbit.cloud");

        assertThat(outcome.status).isEqualTo(403);
        assertThat(outcome.reachedTheApplication).isFalse();
    }

    @Test
    void anOpaqueOriginIsRejectedToo() throws Exception {
        Outcome outcome = post("null");

        assertThat(outcome.status).isEqualTo(403);
        assertThat(outcome.reachedTheApplication).isFalse();
    }

    @Test
    void aRequestWithoutOriginIsNotACrossOriginBrowserRequestAndGoesThrough() throws Exception {
        assertThat(post(null).reachedTheApplication).isTrue();
    }
}
