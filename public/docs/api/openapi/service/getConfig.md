# How this server is configured (/docs/api/openapi/service/getConfig)

`GET /api/config`

Tells a client whether payments are mock or sandbox, whether reviews are simulated, and the upload size limit.

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
  /api/config:
    get:
      tags:
        - Service
      operationId: getConfig
      summary: How this server is configured
      description: Tells a client whether payments are mock or sandbox, whether
        reviews are simulated, and the upload size limit.
      responses:
        "200":
          description: Server configuration.
          content:
            application/json:
              schema:
                type: object
                required:
                  - mode
                  - reviewMode
                  - simulatedReviews
                  - maxUploadBytes
                properties:
                  mode:
                    type: string
                    enum:
                      - mock
                      - sandbox
                    description: The mode.
                    examples:
                      - mock
                  reviewMode:
                    type: string
                    enum:
                      - demo
                      - claude
                    description: The review mode.
                    examples:
                      - demo
                  simulatedReviews:
                    type: boolean
                    description: The simulated reviews.
                    examples:
                      - true
                  maxUploadBytes:
                    type: integer
                    description: The max upload bytes.
                    examples:
                      - 1
                  vendors:
                    type: array
                    items:
                      type: string
                      description: The vendors.
                      examples:
                        - vendors
                    description: The vendors.
                    examples:
                      - []
                  demo:
                    description: Present only on the hosted demo. Contains the demo project and role
                      keys so a visitor can try every role.
                    type:
                      - object
                      - "null"
                    additionalProperties: true
                description: The get config object.
              examples:
                default:
                  value:
                    mode: mock
                    reviewMode: demo
                    simulatedReviews: true
                    maxUploadBytes: 1
                    vendors:
                      - vendors
                    demo: {}
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.service.get_config()
                  # TODO: Handle 'response' of type ApiConfigResponse
              except ApiError as e:
                  ...  # TODO: Handle 'e.error' of type RawError
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.service.getConfig();
                // TODO: Handle 'response' of type ApiConfigResponse
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