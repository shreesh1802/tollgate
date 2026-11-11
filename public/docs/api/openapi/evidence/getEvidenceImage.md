# Fetch an evidence photo (/docs/api/openapi/evidence/getEvidenceImage)

`GET /api/images/{projectId}/{subId}`

Public only after the submission has released funds. Before that, the worker or verifier key is required.

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
  /api/images/{projectId}/{subId}:
    get:
      tags:
        - Evidence
      operationId: getEvidenceImage
      summary: Fetch an evidence photo
      description: Public only after the submission has released funds. Before that,
        the worker or verifier key is required.
      security:
        - {}
        - WorkerKey: []
        - VerifierKey: []
      parameters:
        - name: projectId
          in: path
          required: true
          schema:
            type: string
            description: Project id.
            examples:
              - P1
          description: Project id.
        - name: subId
          in: path
          required: true
          schema:
            type: string
            description: Submission id.
            examples:
              - S1-1
          description: Submission id.
      responses:
        "200":
          description: The photo.
          content:
            image/jpeg:
              schema:
                description: The get evidence image object.
                examples:
                  - photo.jpg
            image/png:
              schema:
                description: The get evidence image object.
                examples:
                  - photo.jpg
        "403":
          $ref: "#/components/responses/Forbidden"
        "404":
          $ref: "#/components/responses/NotFound"
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  client.evidence.get_evidence_image("P1", "S1-1")
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # GetEvidenceImageErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                await client.evidence.getEvidenceImage({
                  projectId: "P1",
                  subId: "S1-1",
                });
              } catch (err) {
                // TODO: Handle 'err' of type Evidence.GetEvidenceImageError, discriminated with 'err.payload.kind'
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
  responses:
    Forbidden:
      description: The key does not allow this, or the evidence is not public yet.
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
          examples:
            default:
              value:
                error: no such project
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