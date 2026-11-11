# Read the audit log and check its hash chain (/docs/api/openapi/projects/getAuditLog)

`GET /api/projects/{id}/audit`

Every decision is an entry that includes the hash of the one before it, so altering history breaks the chain.

```yaml
openapi: 3.2.0
servers:
  - url: https://proofpay-on99.onrender.com
    description: "Production: hosted demo (simulated payments, real AI reviewers)"
    x-environment: production
  - url: http://localhost:3000
    description: "Development: local server"
externalDocs:
  description: Source code and README
  url: https://github.com/shreesh1802/tollgate
paths:
  /api/projects/{id}/audit:
    get:
      tags:
        - Projects
      operationId: getAuditLog
      summary: Read the audit log and check its hash chain
      description: Every decision is an entry that includes the hash of the one before
        it, so altering history breaks the chain.
      parameters:
        - $ref: "#/components/parameters/ProjectId"
      responses:
        "200":
          description: The audit entries and the result of verifying the chain.
          content:
            application/json:
              schema:
                type: object
                required:
                  - chain
                  - entries
                properties:
                  chain:
                    type: object
                    description: Result of re-computing the hash chain.
                    properties:
                      ok:
                        type: boolean
                        description: The ok.
                        examples:
                          - true
                    additionalProperties: true
                  entries:
                    type: array
                    items:
                      type: object
                      additionalProperties: true
                      description: The entries.
                    description: The entries.
                    examples:
                      - []
                description: The get audit log object.
              examples:
                default:
                  value:
                    chain:
                      ok: true
                    entries:
                      - {}
        "404":
          $ref: "#/components/responses/NotFound"
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.projects.get_audit_log("P1")
                  # TODO: Handle 'response' of type
                  # ApiProjectsAuditResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type GetAuditLogErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.projects.getAuditLog({
                  id: "P1",
                });
                // TODO: Handle 'response' of type ApiProjectsAuditResponse
              } catch (err) {
                // TODO: Handle 'err' of type Projects.GetAuditLogError, discriminated with 'err.payload.kind'
              }
components:
  securitySchemes:
    WorkerKey:
      type: apiKey
      in: header
      name: X-Worker-Key
      description: Secret key returned when the project is created. Lets the worker
        upload evidence.
    VerifierKey:
      type: apiKey
      in: header
      name: X-Verifier-Key
      description: Key held by the human verifier. Lets them read the queue and decide
        held cases.
    OrganizerKey:
      type: apiKey
      in: header
      name: X-Organizer-Key
      description: Optional key some servers require to create projects.
  parameters:
    ProjectId:
      name: id
      in: path
      required: true
      schema:
        type: string
      description: Project id.
      examples:
        default:
          value: P1
  responses:
    NotFound:
      description: No such project, stage or submission.
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
          examples:
            default:
              value:
                error: no such project
  schemas:
    Error:
      type: object
      required:
        - error
      properties:
        error:
          type: string
          description: What went wrong, in plain words.
          examples:
            - no such project
      description: The error object.
      examples:
        - error: no such project
info:
  title: ProofPay API
  version: 1.0.0
```