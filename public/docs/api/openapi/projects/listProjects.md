# List projects (/docs/api/openapi/projects/listProjects)

`GET /api/projects`

Also refreshes any payouts that PayPal has accepted but not yet settled.

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
  /api/projects:
    get:
      tags:
        - Projects
      operationId: listProjects
      summary: List projects
      description: Also refreshes any payouts that PayPal has accepted but not yet settled.
      responses:
        "200":
          description: Every project, in short form.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/ProjectSummary"
                description: The list projects object.
                examples:
                  - []
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.projects.list_projects()
                  # TODO: Handle 'response' of type list[ProjectSummary]
              except ApiError as e:
                  ...  # TODO: Handle 'e.error' of type RawError
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.projects.listProjects();
                // TODO: Handle 'response' of type ProjectSummary[]
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
  schemas:
    ProjectSummary:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier.
          examples:
            - P1
        title:
          type: string
          description: Short human-readable title.
          examples:
            - Repair the village hand pump
        totals:
          $ref: "#/components/schemas/Totals"
        stages:
          type: array
          items:
            $ref: "#/components/schemas/StageStatus"
          description: The stages of the project, in order.
          examples:
            - []
      description: The project summary object.
      examples:
        - id: P1
          title: Repair the village hand pump
          totals:
            reserved: "30.00"
            captured: "10.00"
            paid: "10.00"
            inTransit: "0.00"
            problem: "0.00"
          stages:
            - PENDING
    Totals:
      type: object
      description: Amounts in the project currency. `paid` counts only payouts PayPal
        has settled.
      properties:
        reserved:
          type: string
          description: Total reserved on PayPal from donors, not yet taken.
          examples:
            - "30.00"
        captured:
          type: string
          description: Total taken from donors so far.
          examples:
            - "10.00"
        paid:
          type: string
          description: Total paid to the worker and settled by PayPal.
          examples:
            - "10.00"
        inTransit:
          type: string
          description: Paid out but not yet settled by PayPal.
          examples:
            - "0.00"
        problem:
          type: string
          description: Payouts that failed, were returned or are unclaimed.
          examples:
            - "0.00"
      examples:
        - reserved: "30.00"
          captured: "10.00"
          paid: "10.00"
          inTransit: "0.00"
          problem: "0.00"
    StageStatus:
      type: string
      enum:
        - PENDING
        - ACTIVE
        - RELEASED
      description: The stage status object.
      examples:
        - PENDING
info:
  title: ProofPay API
  version: 1.0.0
```