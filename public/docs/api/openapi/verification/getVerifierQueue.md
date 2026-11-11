# Submissions waiting for a human (/docs/api/openapi/verification/getVerifierQueue)

`GET /api/verify/queue`

Submissions the gate held for review, and ones whose payment release failed and needs a retry.

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
  /api/verify/queue:
    get:
      tags:
        - Verification
      operationId: getVerifierQueue
      summary: Submissions waiting for a human
      description: Submissions the gate held for review, and ones whose payment
        release failed and needs a retry.
      security:
        - VerifierKey: []
      responses:
        "200":
          description: The queue.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/QueueItem"
                description: The get verifier queue object.
                examples:
                  - []
        "401":
          $ref: "#/components/responses/Unauthorized"
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.verification.get_verifier_queue()
                  # TODO: Handle 'response' of type list[QueueItem]
              except ApiError as e:
                  # TODO: Handle 'e.error' of type
                  # GetVerifierQueueErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response =
                  await client.verification.getVerifierQueue();
                // TODO: Handle 'response' of type QueueItem[]
              } catch (err) {
                // TODO: Handle 'err' of type Verification.GetVerifierQueueError, discriminated with 'err.payload.kind'
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
    QueueItem:
      type: object
      properties:
        projectId:
          type: string
          description: Id of the project.
          examples:
            - P1
        projectTitle:
          type: string
          description: Title of the project.
          examples:
            - Repair the village hand pump
        stage:
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
            spec:
              type: string
              description: What the photo must show for this stage. The AI reviewers judge
                against this text.
              examples:
                - The new pump head is installed and bolted to the base.
          description: The stage this item belongs to.
          examples:
            - id: P1
              title: Repair the village hand pump
              spec: The new pump head is installed and bolted to the base.
        submission:
          type: object
          additionalProperties: true
          properties:
            id:
              type: string
              description: Unique identifier.
              examples:
                - P1
            status:
              $ref: "#/components/schemas/SubmissionStatus"
            releaseError:
              type:
                - string
                - "null"
              description: Why the payment release failed, if it did.
              examples:
                - PayPal timeout
            receivedAt:
              type: string
              format: date-time
              description: When the server received the photo (ISO 8601, UTC).
              examples:
                - 2026-11-10T19:09:04.352Z
            facts:
              type: object
              additionalProperties: true
              description: "Facts read from the photo: time, location, perceptual hash."
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
          description: The submission waiting for review.
          examples:
            - id: P1
              status: RECEIVED
              releaseError: PayPal timeout
              receivedAt: 2026-11-10T19:09:04.352Z
              facts: {}
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
              reasons:
                - rule: code-missing
              checks:
                - id: duplicate
                  status: pass
                  detail: Photo taken 12 m from the site
        evidenceHash:
          type: string
          description: Fingerprint of the evidence the verifier is approving. Send it back
            unchanged.
          examples:
            - 9f2c1b7a
        imageUrl:
          type: string
          description: Path of the evidence photo.
          examples:
            - /api/images/P1/S1-1
      description: The queue item object.
      examples:
        - projectId: P1
          projectTitle: Repair the village hand pump
          stage:
            id: P1
            title: Repair the village hand pump
            spec: The new pump head is installed and bolted to the base.
          submission:
            id: P1
            status: RECEIVED
            releaseError: PayPal timeout
            receivedAt: 2026-11-10T19:09:04.352Z
            facts: {}
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
            reasons:
              - rule: code-missing
            checks:
              - id: duplicate
                status: pass
                detail: Photo taken 12 m from the site
          evidenceHash: 9f2c1b7a
          imageUrl: /api/images/P1/S1-1
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
  responses:
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