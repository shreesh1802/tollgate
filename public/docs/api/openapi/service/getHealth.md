# Liveness check (/docs/api/openapi/service/getHealth)

`GET /api/health`

`uptimeSeconds` lets an operator tell a restarting process from a routing problem.

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
  /api/health:
    get:
      tags:
        - Service
      operationId: getHealth
      summary: Liveness check
      description: "`uptimeSeconds` lets an operator tell a restarting process from a
        routing problem."
      responses:
        "200":
          description: The server is up.
          content:
            application/json:
              schema:
                type: object
                required:
                  - ok
                  - uptimeSeconds
                properties:
                  ok:
                    type: boolean
                    description: The ok.
                    examples:
                      - true
                  uptimeSeconds:
                    type: integer
                    description: The uptime seconds.
                    examples:
                      - 3600
                description: The get health object.
              examples:
                default:
                  value:
                    ok: true
                    uptimeSeconds: 3600
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.service.get_health()
                  # TODO: Handle 'response' of type ApiHealthResponse
              except ApiError as e:
                  ...  # TODO: Handle 'e.error' of type RawError
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.service.getHealth();
                // TODO: Handle 'response' of type ApiHealthResponse
              } catch (err) {
                // TODO: Handle 'err' of type ApiError, where 'err.payload' is always the Undeclared arm
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
info:
  title: ProofPay API
  version: 1.0.0
```