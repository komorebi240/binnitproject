package com.company.project.unit.common;

import com.company.project.common.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import static org.assertj.core.api.Assertions.assertThat;

/** Framework request errors must map to 4xx, never leak as the generic 500. */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void oversizedUploadIs413() {
        var response = handler.handleUploadTooLarge(new MaxUploadSizeExceededException(5L));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
        assertThat(response.getBody().error().code()).isEqualTo("PAYLOAD_TOO_LARGE");
    }

    @Test
    void missingMultipartPartIs400() {
        var response = handler.handleMalformedRequest(new MissingServletRequestPartException("file"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void unknownRouteIs404() {
        var response = handler.handleNoResource(new NoResourceFoundException(org.springframework.http.HttpMethod.GET, "/nope"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void wrongMethodIs405() {
        var response = handler.handleMethodNotSupported(new HttpRequestMethodNotSupportedException("PATCH"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.METHOD_NOT_ALLOWED);
    }

    @Test
    void genuinelyUnexpectedErrorStaysAGenericFiveHundred() {
        var response = handler.handleUnexpected(new IllegalStateException("boom"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody().error().message()).doesNotContain("boom");
    }
}
