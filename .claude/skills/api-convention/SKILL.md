---
name: api-convention
description: Design or review HTTP APIs for consistent contracts, validation, authorization, safe errors, and backward compatibility.
---

# API convention

Use for public or internal HTTP API routes, handlers, contracts, and API tests.

## Rules

Inspect existing API conventions first. Use resource-oriented endpoint names, correct HTTP methods/status codes, validated inputs, backend authentication/authorization, and deliberate pagination/filtering/sorting/versioning where needed. Do not expose stack traces, SQL, paths, secrets, or implementation details.

Unless the project already has a different contract, use:

```json
{"success":true,"data":{},"message":null,"errors":[]}
```

For errors:

```json
{"success":false,"data":null,"message":"Validation failed","errors":[{"field":"email","code":"INVALID_FORMAT","message":"Invalid email format"}]}
```

Changing an established response shape or making a breaking contract change requires approval. Test valid, invalid, unauthenticated, unauthorized, not-found, and relevant boundary cases.
