package com.company.project.common;

/**
 * Authority tier for a user's position within their company. Deliberately not "role"
 * (CEO/CTO/COO are all EXECUTIVE — same permission tier, different display title) — see
 * the Phase 1 plan for why title and authority level are kept separate.
 *
 * Scope each tier acts on:
 * EXECUTIVE       -> entire company (multiple executives per company allowed)
 * DEPARTMENT_HEAD -> their own department, including its teams and employees (multiple
 *                    heads per department allowed)
 * TEAM_LEAD       -> their own team only (multiple leads per team allowed)
 * EMPLOYEE        -> themselves; belongs to a department and optionally a team
 */
public enum AuthorityLevel {
    EXECUTIVE,
    DEPARTMENT_HEAD,
    TEAM_LEAD,
    EMPLOYEE
}
