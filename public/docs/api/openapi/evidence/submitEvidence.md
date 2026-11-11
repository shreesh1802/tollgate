# Upload photo evidence for a stage (/docs/api/openapi/evidence/submitEvidence)

`POST /api/projects/{id}/stages/{stageId}/submissions`

The body is the raw image (JPEG or PNG), not a form. The server checks for duplicates,
location and time from the photo's metadata, and that the one-time code is visible, then
asks two independent AI reviewers. The deterministic gate decides: RELEASE, RESUBMIT,
HOLD (a human decides) or BLOCK. On RELEASE each donor's share is captured and the worker
is paid.

On a demo server with simulated reviewers, `demoCode`, `demoMatch` and `demoFlags` steer
the simulated reviewers; they are ignored when real reviewers are used.


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
  /api/projects/{id}/stages/{stageId}/submissions:
    post:
      tags:
        - Evidence
      operationId: submitEvidence
      summary: Upload photo evidence for a stage
      description: >
        The body is the raw image (JPEG or PNG), not a form. The server checks
        for duplicates,

        location and time from the photo's metadata, and that the one-time code
        is visible, then

        asks two independent AI reviewers. The deterministic gate decides:
        RELEASE, RESUBMIT,

        HOLD (a human decides) or BLOCK. On RELEASE each donor's share is
        captured and the worker

        is paid.


        On a demo server with simulated reviewers, `demoCode`, `demoMatch` and
        `demoFlags` steer

        the simulated reviewers; they are ignored when real reviewers are used.
      security:
        - WorkerKey: []
      parameters:
        - $ref: "#/components/parameters/ProjectId"
        - name: stageId
          in: path
          required: true
          schema:
            type: string
            description: Stage id within the project.
            examples:
              - S1
          description: Stage id within the project.
        - name: demoCode
          in: query
          required: false
          schema:
            type: string
            description: Simulated reviewers only. The code they report seeing.
            examples:
              - demoCode
          description: Simulated reviewers only. The code they report seeing.
        - name: demoMatch
          in: query
          required: false
          schema:
            type: string
            description: Simulated reviewers only. Send 0 to make the simulated reviewers
              say the photo does not match the stage; any other value means it
              matches.
            examples:
              - "0"
          description: Simulated reviewers only. Send 0 to make the simulated reviewers
            say the photo does not match the stage; any other value means it
            matches.
        - name: demoFlags
          in: query
          required: false
          schema:
            type: string
            description: Simulated reviewers only. Comma-separated suspicion flags.
            examples:
              - demoFlags
          description: Simulated reviewers only. Comma-separated suspicion flags.
      requestBody:
        required: true
        content:
          image/jpeg:
            schema:
              description: The submit evidence object.
              examples:
                - photo.jpg
          image/png:
            schema:
              description: The submit evidence object.
              examples:
                - photo.jpg
        description: The raw photo bytes (JPEG or PNG).
      responses:
        "200":
          description: The decision for this submission.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SubmissionResult"
              examples:
                default:
                  value:
                    decision: RELEASE
                    status: RECEIVED
                    submissionId: S1-1
                    reasons:
                      - rule: code-missing
                    checks:
                      - id: duplicate
                        status: pass
                        detail: Photo taken 12 m from the site
                    reviews:
                      - reviewer: checklist
                        matchesSpec: true
                        confidence: 0.9
                        observations: A new green pump is bolted to the concrete base.
                        visibleCode: 7K2Q
                        suspicion:
                          - suspicion
                        textInImage: 7K2Q
                        error: no such project
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
        "403":
          $ref: "#/components/responses/Forbidden"
        "404":
          $ref: "#/components/responses/NotFound"
        "409":
          description: The stage is not accepting evidence (it is not the active stage).
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
              examples:
                default:
                  value:
                    error: no such project
        "413":
          description: The upload is larger than `maxUploadBytes`.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
              examples:
                default:
                  value:
                    error: no such project
        "415":
          description: The file is not a JPEG or PNG.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
              examples:
                default:
                  value:
                    error: no such project
        "429":
          description: The hourly AI review quota has been reached.
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
                  response = client.evidence.submit_evidence(
                      "P1",
                      "S1",
                      {},
                      demo_code="demoCode",
                      demo_match="0",
                      demo_flags="demoFlags",
                  )
                  # TODO: Handle 'response' of type SubmissionResult
              except ApiError as e:
                  # TODO: Handle 'e.error' of type SubmitEvidenceErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.evidence.submitEvidence({
                  id: "P1",
                  stageId: "S1",
                  demoCode: "demoCode",
                  demoMatch: "0",
                  demoFlags: "demoFlags",
                  body: {},
                });
                // TODO: Handle 'response' of type SubmissionResult
              } catch (err) {
                // TODO: Handle 'err' of type Evidence.SubmitEvidenceError, discriminated with 'err.payload.kind'
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
  schemas:
    SubmissionResult:
      type: object
      properties:
        decision:
          $ref: "#/components/schemas/Decision"
        status:
          $ref: "#/components/schemas/SubmissionStatus"
        submissionId:
          type: string
          description: Id of the submission.
          examples:
            - S1-1
        reasons:
          type: array
          items:
            type: object
            additionalProperties: true
            description: The reasons.
          description: Why the gate decided this way, as rule ids such as
            duplicate-evidence or code-missing.
          examples:
            - - rule: code-missing
        checks:
          type: array
          items:
            $ref: "#/components/schemas/Check"
          description: Results of the deterministic checks.
          examples:
            - - id: duplicate
                status: pass
                detail: Photo taken 12 m from the site
        reviews:
          type: array
          items:
            $ref: "#/components/schemas/Review"
          description: Opinions of the two independent AI reviewers.
          examples:
            - - reviewer: checklist
                matchesSpec: true
                confidence: 0.9
                observations: A new green pump is bolted to the concrete base.
                visibleCode: 7K2Q
                suspicion:
                  - suspicion
                textInImage: 7K2Q
                error: no such project
        release:
          $ref: "#/components/schemas/Release"
      description: The submission result object.
      examples:
        - decision: RELEASE
          status: RECEIVED
          submissionId: S1-1
          reasons:
            - rule: code-missing
          checks:
            - id: duplicate
              status: pass
              detail: Photo taken 12 m from the site
          reviews:
            - reviewer: checklist
              matchesSpec: true
              confidence: 0.9
              observations: A new green pump is bolted to the concrete base.
              visibleCode: 7K2Q
              suspicion:
                - suspicion
              textInImage: 7K2Q
              error: no such project
          release:
            ok: true
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
    Decision:
      type: string
      enum:
        - RELEASE
        - RESUBMIT
        - HOLD
        - BLOCK
      description: The decision object.
      examples:
        - RELEASE
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
    Check:
      type: object
      properties:
        id:
          type: string
          enum:
            - duplicate
            - location
            - time
            - code
          description: Unique identifier.
          examples:
            - duplicate
        status:
          type: string
          enum:
            - pass
            - fail
            - unknown
          description: Current state.
          examples:
            - pass
        detail:
          type: string
          description: Explanation of the result.
          examples:
            - Photo taken 12 m from the site
      description: The check object.
      examples:
        - id: duplicate
          status: pass
          detail: Photo taken 12 m from the site
    Review:
      type: object
      description: One independent AI reviewer's structured opinion. It advises; it
        never decides.
      additionalProperties: true
      properties:
        reviewer:
          type: string
          description: Which reviewer produced this opinion.
          examples:
            - checklist
        matchesSpec:
          type: boolean
          description: Whether the photo shows what the stage requires.
          examples:
            - true
        confidence:
          type: number
          minimum: 0
          maximum: 1
          description: How sure the reviewer is, from 0 to 1.
          examples:
            - 0.9
        observations:
          type: string
          description: What the reviewer saw, in plain words.
          examples:
            - A new green pump is bolted to the concrete base.
        visibleCode:
          type:
            - string
            - "null"
          description: The one-time code the reviewer read in the photo, or null.
          examples:
            - 7K2Q
        suspicion:
          type: array
          items:
            type: string
            description: The suspicion.
            examples:
              - suspicion
          description: Flags raised about the photo, such as screen-photo.
          examples:
            - []
        textInImage:
          type:
            - string
            - "null"
          description: Text read out of the photo. Treated as data, never as instructions.
          examples:
            - 7K2Q
        error:
          type: string
          description: What went wrong, in plain words.
          examples:
            - no such project
      examples:
        - reviewer: checklist
          matchesSpec: true
          confidence: 0.9
          observations: A new green pump is bolted to the concrete base.
          visibleCode: 7K2Q
          suspicion:
            - suspicion
          textInImage: 7K2Q
          error: no such project
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
info:
  title: ProofPay API
  version: 1.0.0
```