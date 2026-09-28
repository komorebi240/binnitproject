package com.company.project.common;

import java.util.List;

public record ApiError(String code, String message, List<FieldError> fieldErrors) {

    public ApiError(String code, String message) {
        this(code, message, null);
    }

    public record FieldError(String field, String message) {
    }
}
