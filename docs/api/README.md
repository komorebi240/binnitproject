# API documentation

The source of truth for the API contract is the running backend's generated OpenAPI spec, not
a hand-maintained document here — hand-written API docs drift from the code within a few
sprints. Once the backend runs locally:

* Swagger UI: `http://localhost:8080/swagger-ui.html`
* Raw OpenAPI JSON: `http://localhost:8080/v3/api-docs`

## Conventions (see [CLAUDE.md § 46.4](../../CLAUDE.md#464-api-convention-extends-section-11) for the full contract)

* All routes are versioned under `/api/v1/...`. A breaking change gets `/api/v2/...` alongside
  the old version, not an in-place change — see root CLAUDE.md section 37 (backward
  compatibility).
* Every response — success or error — uses the same envelope (`success`, `data`, `error`, `meta`).
* List endpoints are paginated via `page`/`size`/`sort` query params.

This folder is for notes that don't belong in the OpenAPI spec itself: versioning policy,
deprecation timelines, and cross-cutting rules like the ones above.
