# Approve or reject a held submission (/docs/api/openapi/verification/decideSubmission)

`POST /api/verify/{projectId}/{submissionId}`

Approval is bound to the evidence the verifier saw: send the `evidenceHash` from the queue
item. If the evidence changed since, the call fails with 409 and nothing is released.


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
  /api/verify/{projectId}/{submissionId}:
    post:
      tags:
        - Verification
      operationId: decideSubmission
      summary: Approve or reject a held submission
      description: >
        Approval is bound to the evidence the verifier saw: send the
        `evidenceHash` from the queue

        item. If the evidence changed since, the call fails with 409 and nothing
        is released.
      security:
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
        - name: submissionId
          in: path
          required: true
          schema:
            type: string
            description: Submission id from the verifier queue.
            examples:
              - S1-1
          description: Submission id from the verifier queue.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - decision
              properties:
                decision:
                  type: string
                  enum:
                    - approve
                    - reject
                  description: The decision.
                  examples:
                    - approve
                evidenceHash:
                  type: string
                  description: The hash from the queue item. Required to approve.
                  examples:
                    - evidenceHash
              description: The decide submission object.
            examples:
              default:
                value:
                  decision: approve
                  evidenceHash: evidenceHash
        description: The verifier decision.
      responses:
        "200":
          description: The submission's new status.
          content:
            application/json:
              schema:
                type: object
                required:
                  - status
                properties:
                  status:
                    $ref: "#/components/schemas/SubmissionStatus"
                  release:
                    $ref: "#/components/schemas/Release"
                description: The decide submission object.
              examples:
                default:
                  value:
                    status: RECEIVED
                    release:
                      ok: true
                      reason: capture failed
                      payout:
                        amount: "25"
                        status: ACTIVE
                      captures:
                        - {}
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "409":
          description: The submission is not awaiting review, or the evidence changed
            since it was shown.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
              examples:
                default:
                  value:
                    error: no such project
        "502":
          description: PayPal returned an error. Nothing was released.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
              examples:
                default:
                  value:
                    error: no such project
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.verification.decide_submission(
                      "P1",
                      "S1-1",
                      ApiVerifyRequest(
                          decision=Decision1.APPROVE,
                          evidence_hash="evidenceHash",
                      ),
                  )
                  # TODO: Handle 'response' of type ApiVerifyResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # DecideSubmissionErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response =
                  await client.verification.decideSubmission({
                    projectId: "P1",
                    submissionId: "S1-1",
                    body: {
                      decision: Decision1.Approve,
                      evidenceHash: "evidenceHash",
                    },
                  });
                // TODO: Handle 'response' of type ApiVerifyResponse
              } catch (err) {
                // TODO: Handle 'err' of type Verification.DecideSubmissionError, discriminated with 'err.payload.kind'
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
    SubmissionStatus:
      type: string
      enum:
        - RECEIVED
        - RELEASED
        - PENDING_REVIEW
        - RESUBMIT
        - BLOCKED
        - REJECTED
        - RELEASE_FAILED
      description: The submission status object.
      examples:
        - RECEIVED
    Release:
      type: object
      properties:
        ok:
          type: boolean
          description: Whether the operation succeeded.
          examples:
            - true
        reason:
          type: string
          description: Why it failed, if it did.
          examples:
            - capture failed
        payout:
          $ref: "#/components/schemas/Payout"
        captures:
          type: array
          items:
            type: object
            additionalProperties: true
            description: The captures.
          description: Per-donor captures made for this release.
          examples:
            - - {}
      description: The release object.
      examples:
        - ok: true
          reason: capture failed
          payout:
            amount: "25"
            status: ACTIVE
          captures:
            - {}
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
    Payout:
      type: object
      description: The PayPal payout to the worker for a stage. PayPal settles it
        after accepting it.
      additionalProperties: true
      properties:
        amount:
          type: string
          description: Amount in the project currency.
          examples:
            - "25"
        status:
          type: string
          description: PayPal's own payout status (for example PENDING or SUCCESS).
          examples:
            - ACTIVE
      examples:
        - amount: "25"
          status: ACTIVE
  responses:
    BadRequest:
      description: The request was invalid. The message says what to fix.
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
          examples:
            default:
              value:
                error: no such project
    Unauthorized:
      description: A required key is missing or wrong.
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
          examples:
            default:
              value:
                error: no such project
info:
  title: ProofPay API
  version: 1.0.0
```