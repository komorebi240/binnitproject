package com.company.project.common;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

/**
 * Standard response envelope for every REST endpoint (success and error alike).
 * See CLAUDE.md section 46.4 for the contract this mirrors.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
        boolean success,
        T data,
        ApiError error,
        Meta meta
) {

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, data, null, Meta.now());
    }

    public static <T> ApiResponse<T> success(T data, PaginationMeta pagination) {
        return new ApiResponse<>(true, data, null, Meta.withPagination(pagination));
    }

    public static <T> ApiResponse<T> failure(ApiError error) {
        return new ApiResponse<>(false, null, error, Meta.now());
    }

    public record Meta(Instant timestamp, PaginationMeta pagination) {
        static Meta now() {
            return new Meta(Instant.now(), null);
        }

        static Meta withPagination(PaginationMeta pagination) {
            return new Meta(Instant.now(), pagination);
        }
    }

    public record PaginationMeta(int page, int size, long totalElements, int totalPages) {
    }
}
