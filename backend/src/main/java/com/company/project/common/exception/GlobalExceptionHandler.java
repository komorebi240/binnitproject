package com.company.project.common.exception;

import com.company.project.common.ApiError;
import com.company.project.common.ApiResponse;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;

/**
 * Single translation point from exceptions to the standard API envelope (CLAUDE.md section 46.4).
 * No controller should catch exceptions to hand-roll its own error shape.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        List<ApiError.FieldError> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> new ApiError.FieldError(fe.getField(), fe.getDefaultMessage()))
                .toList();
        ApiError error = new ApiError("VALIDATION_ERROR", "Request validation failed", fieldErrors);
        return ResponseEntity.badRequest().body(ApiResponse.failure(error));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolation(ConstraintViolationException ex) {
        ApiError error = new ApiError("VALIDATION_ERROR", ex.getMessage());
        return ResponseEntity.badRequest().body(ApiResponse.failure(error));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(ResourceNotFoundException ex) {
        ApiError error = new ApiError("NOT_FOUND", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.failure(error));
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusiness(BusinessException ex) {
        ApiError error = new ApiError(ex.getCode(), ex.getMessage());
        return ResponseEntity.status(ex.getStatus()).body(ApiResponse.failure(error));
    }

    // Covers BadCredentialsException, DisabledException, LockedException, etc. — deliberately
    // one generic message for all of them so a wrong password and a deactivated account are
    // indistinguishable to the caller (CLAUDE.md section 13, credential stuffing / user
    // enumeration).
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuthenticationFailure(AuthenticationException ex) {
        ApiError error = new ApiError("UNAUTHENTICATED", "Invalid username or password");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.failure(error));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
        ApiError error = new ApiError("FORBIDDEN", "You do not have permission to perform this action");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.failure(error));
    }

    // Catch-all: never leak stack traces, SQL, or internal paths to the client (CLAUDE.md section 14).
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception ex) {
        log.error("Unhandled exception", ex);
        ApiError error = new ApiError("INTERNAL_ERROR", "An unexpected error occurred");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.failure(error));
    }
}
