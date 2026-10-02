package com.company.project.modules.identity.dto.response;

/** {@code logoUrl} is a same-origin API path (null when no logo is set); the {@code v} query only busts the browser cache. */
public record CompanyResponse(Long id, String name, String contactEmail, String logoUrl) {
}
