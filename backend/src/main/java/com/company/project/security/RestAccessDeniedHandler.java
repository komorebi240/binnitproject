package com.company.project.security;

import com.company.project.common.ApiError;
import com.company.project.common.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Runs at the security-filter level (before the DispatcherServlet), so it - not
 * GlobalExceptionHandler - is what actually answers an authenticated-but-forbidden request.
 * Keeps the response on the same envelope as every other error (CLAUDE.md section 46.4).
 */
@Component
public class RestAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper objectMapper;

    public RestAccessDeniedHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                        AccessDeniedException accessDeniedException) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ApiResponse<Void> body = ApiResponse.failure(
                new ApiError("FORBIDDEN", "You do not have permission to perform this action"));
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
