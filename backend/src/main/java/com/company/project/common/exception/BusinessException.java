package com.company.project.common.exception;

import org.springframework.http.HttpStatus;

/**
 * A domain rule violation that maps to a client-facing 4xx response
 * (e.g. duplicate order, insufficient stock) rather than an unexpected server failure.
 */
public class BusinessException extends RuntimeException {

    private final String code;
    private final HttpStatus status;

    public BusinessException(String code, String message, HttpStatus status) {
        super(message);
        this.code = code;
        this.status = status;
    }

    public String getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
