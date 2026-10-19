package com.company.project.modules.identity.dto.request;

import com.company.project.common.validation.MaxUtf8Bytes;
import com.company.project.common.AuthorityLevel;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * No companyId field - new users always join the caller's own company (CLAUDE.md
 * section 9/10). Whether the caller is allowed to grant {@code authorityLevel} within
 * {@code departmentId}/{@code teamId} is a business rule checked in the service layer
 * (e.g. a DEPARTMENT_HEAD may only create TEAM_LEAD/EMPLOYEE inside their own department),
 * not something Bean Validation alone can express.
 */
public record CreateUserRequest(
        @NotBlank(message = "username is required")
        @Size(max = 100, message = "username must be at most 100 characters")
        String username,

        @NotBlank(message = "password is required")
        @Size(min = 8, message = "password must be at least 8 characters")
        @MaxUtf8Bytes(value = 72, message = "password must be at most 72 bytes (BCrypt's limit; accented letters take 2-3 bytes)")
        String password,

        @NotBlank(message = "fullName is required")
        @Size(max = 200, message = "fullName must be at most 200 characters")
        String fullName,

        @Email(message = "email must be a valid address")
        String email,

        @NotNull(message = "authorityLevel is required")
        AuthorityLevel authorityLevel,

        String title,

        Long departmentId,

        Long teamId,

        @Size(max = 30, message = "phone must be at most 30 characters")
        String phone,

        @Size(max = 50, message = "employeeCode must be at most 50 characters")
        String employeeCode,

        LocalDate startDate
) {
}
