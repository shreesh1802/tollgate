# Read one project (/docs/api/openapi/projects/getProject)

`GET /api/projects/{id}`

The public view: donations, totals, stages and each stage's submissions. Send
`X-Worker-Key` to also receive the one-time code of the active stage.


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
  /api/projects/{id}:
    get:
      tags:
        - Projects
      operationId: getProject
      summary: Read one project
      description: >
        The public view: donations, totals, stages and each stage's submissions.
        Send

        `X-Worker-Key` to also receive the one-time code of the active stage.
      security:
        - {}
        - WorkerKey: []
      parameters:
        - $ref: "#/components/parameters/ProjectId"
      responses:
        "200":
          description: The project.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Project"
              examples:
                default:
                  value:
                    id: P1
                    title: Repair the village hand pump
                    startedAt: 2026-11-01T09:00:00.000Z
                    currency: USD
                    worker:
                      name: Ravi Kumar
                    site:
                      lat: 12.9716
                      lon: 77.5946
                      radiusM: 150
                    donations:
                      - id: P1
                        donor: Asha
                        amount: 25
                        status: AWAITING_APPROVAL
                        released: "10.00"
                    totals:
                      reserved: "30.00"
                      captured: "10.00"
                      paid: "10.00"
                      inTransit: "0.00"
                      problem: "0.00"
                    holdExpiresAt: 2026-11-30T09:00:00.000Z
                    stages:
                      - id: P1
                        index: 0
                        title: Repair the village hand pump
                        spec: The new pump head is installed and bolted to the base.
                        pct: 40
                        window:
                          from: 2026-11-01T00:00:00Z
                          to: 2026-11-30T23:59:59Z
                        status: PENDING
                        release:
                          ok: true
                          reason: capture failed
                          payout:
                            amount: "25"
                            status: ACTIVE
                          captures:
                            - {}
                        releasedAt: 2026-11-10T19:10:12.000Z
                        code: 7K2Q
                        submissions:
                          - id: P1
                            status: RECEIVED
                            receivedAt: 2026-11-10T19:09:04.352Z
                            decision: RELEASE
                            reasons:
                              - code-missing
        "404":
          $ref: "#/components/responses/NotFound"
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.projects.get_project("P1")
                  # TODO: Handle 'response' of type Project
              except ApiError as e:
                  # TODO: Handle 'e.error' of type GetProjectErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.projects.getProject({
                  id: "P1",
                });
                // TODO: Handle 'response' of type Project
              } catch (err) {
                // TODO: Handle 'err' of type Projects.GetProjectError, discriminated with 'err.payload.kind'
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
    Project:
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
        startedAt:
          type:
            - string
            - "null"
          format: date-time
          description: When the project was created (ISO 8601, UTC).
          examples:
            - 2026-11-01T09:00:00.000Z
        currency:
          type: string
          description: ISO 4217 currency code of every amount in the project.
          examples:
            - USD
        worker:
          type: object
          properties:
            name:
              type: string
              description: Full name.
              examples:
                - Ravi Kumar
          description: The person who does the work and gets paid.
          examples:
            - name: Ravi Kumar
        site:
          $ref: "#/components/schemas/Site"
        donations:
          type: array
          items:
            $ref: "#/components/schemas/Donation"
          description: Every donation to the project.
          examples:
            - - id: P1
                donor: Asha
                amount: 25
                status: AWAITING_APPROVAL
                released: "10.00"
        totals:
          $ref: "#/components/schemas/Totals"
        holdExpiresAt:
          type:
            - string
            - "null"
          format: date-time
          description: When the earliest PayPal reservation lapses.
          examples:
            - 2026-11-30T09:00:00.000Z
        stages:
          type: array
          items:
            $ref: "#/components/schemas/Stage"
          description: The stages of the project, in order.
          examples:
            - - id: P1
                index: 0
                title: Repair the village hand pump
                spec: The new pump head is installed and bolted to the base.
                pct: 40
                window:
                  from: 2026-11-01T00:00:00Z
                  to: 2026-11-30T23:59:59Z
                status: PENDING
                release:
                  ok: true
                  reason: capture failed
                  payout:
                    amount: "25"
                    status: ACTIVE
                  captures:
                    - {}
                releasedAt: 2026-11-10T19:10:12.000Z
                code: 7K2Q
                submissions:
                  - id: P1
                    status: RECEIVED
                    receivedAt: 2026-11-10T19:09:04.352Z
                    decision: RELEASE
                    reasons:
                      - code-missing
      description: The project object.
      examples:
        - id: P1
          title: Repair the village hand pump
          startedAt: 2026-11-01T09:00:00.000Z
          currency: USD
          worker:
            name: Ravi Kumar
          site:
            lat: 12.9716
            lon: 77.5946
            radiusM: 150
          donations:
            - id: P1
              donor: Asha
              amount: 25
              status: AWAITING_APPROVAL
              released: "10.00"
          totals:
            reserved: "30.00"
            captured: "10.00"
            paid: "10.00"
            inTransit: "0.00"
            problem: "0.00"
          holdExpiresAt: 2026-11-30T09:00:00.000Z
          stages:
            - id: P1
              index: 0
              title: Repair the village hand pump
              spec: The new pump head is installed and bolted to the base.
              pct: 40
              window:
                from: 2026-11-01T00:00:00Z
                to: 2026-11-30T23:59:59Z
              status: PENDING
              release:
                ok: true
                reason: capture failed
                payout:
                  amount: "25"
                  status: ACTIVE
                captures:
                  - {}
              releasedAt: 2026-11-10T19:10:12.000Z
              code: 7K2Q
              submissions:
                - id: P1
                  status: RECEIVED
                  receivedAt: 2026-11-10T19:09:04.352Z
                  decision: RELEASE
                  reasons:
                    - code-missing
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
    Site:
      type: object
      required:
        - lat
        - lon
        - radiusM
      properties:
        lat:
          type: number
          minimum: -90
          maximum: 90
          description: Latitude of the job site in degrees.
          examples:
            - 12.9716
        lon:
          type: number
          minimum: -180
          maximum: 180
          description: Longitude of the job site in degrees.
          examples:
            - 77.5946
        radiusM:
          type: number
          minimum: 10
          maximum: 5000
          description: Photos must be taken within this many metres.
          examples:
            - 150
      description: The site object.
      examples:
        - lat: 12.9716
          lon: 77.5946
          radiusM: 150
    Donation:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier.
          examples:
            - P1
        donor:
          type: string
          description: Display name of the donor.
          examples:
            - Asha
        amount:
          type: number
          description: Amount in the project currency.
          examples:
            - 25
        status:
          $ref: "#/components/schemas/DonationStatus"
        released:
          type: string
          description: How much of this donation has been captured so far.
          examples:
            - "10.00"
      description: The donation object.
      examples:
        - id: P1
          donor: Asha
          amount: 25
          status: AWAITING_APPROVAL
          released: "10.00"
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
    Stage:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier.
          examples:
            - P1
        index:
          type: integer
          description: Position of the stage, starting at 0.
          examples:
            - 0
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
        pct:
          type: integer
          description: Share of the total released at this stage, as a whole percent. All
            stages sum to 100.
          examples:
            - 40
        window:
          $ref: "#/components/schemas/TimeWindow"
        status:
          $ref: "#/components/schemas/StageStatus"
        release:
          $ref: "#/components/schemas/Release"
        releasedAt:
          type:
            - string
            - "null"
          format: date-time
          description: When the stage payment was released (ISO 8601, UTC).
          examples:
            - 2026-11-10T19:10:12.000Z
        code:
          type: string
          description: The one-time code to write on paper in the photo. Only returned to
            the worker, only while the stage is ACTIVE.
          examples:
            - 7K2Q
        submissions:
          type: array
          items:
            $ref: "#/components/schemas/SubmissionSummary"
          description: Evidence uploads for this stage.
          examples:
            - - id: P1
                status: RECEIVED
                receivedAt: 2026-11-10T19:09:04.352Z
                decision: RELEASE
                reasons:
                  - code-missing
      description: The stage object.
      examples:
        - id: P1
          index: 0
          title: Repair the village hand pump
          spec: The new pump head is installed and bolted to the base.
          pct: 40
          window:
            from: 2026-11-01T00:00:00Z
            to: 2026-11-30T23:59:59Z
          status: PENDING
          release:
            ok: true
            reason: capture failed
            payout:
              amount: "25"
              status: ACTIVE
            captures:
              - {}
          releasedAt: 2026-11-10T19:10:12.000Z
          code: 7K2Q
          submissions:
            - id: P1
              status: RECEIVED
              receivedAt: 2026-11-10T19:09:04.352Z
              decision: RELEASE
              reasons:
                - code-missing
    TimeWindow:
      type: object
      required:
        - from
        - to
      properties:
        from:
          type: string
          format: date-time
          description: Start of the window (ISO 8601).
          examples:
            - 2026-11-01T00:00:00Z
        to:
          type: string
          format: date-time
          description: End of the window (ISO 8601).
          examples:
            - 2026-11-30T23:59:59Z
      description: The time window object.
      examples:
        - from: 2026-11-01T00:00:00Z
          to: 2026-11-30T23:59:59Z
    StageStatus:
      type: string
      enum:
        - PENDING
        - ACTIVE
        - RELEASED
      description: The stage status object.
      examples:
        - PENDING
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
    SubmissionSummary:
      type: object
      properties:
        id:
          type: string
          description: Unique identifier.
          examples:
            - P1
        status:
          $ref: "#/components/schemas/SubmissionStatus"
        receivedAt:
          type: string
          format: date-time
          description: When the server received the photo (ISO 8601, UTC).
          examples:
            - 2026-11-10T19:09:04.352Z
        decision:
          $ref: "#/components/schemas/Decision"
        reasons:
          type: array
          items:
            type: string
            description: Rule id such as duplicate-evidence or code-missing.
            examples:
              - reasons
          description: Why the gate decided this way, as rule ids such as
            duplicate-evidence or code-missing.
          examples:
            - - code-missing
      description: The submission summary object.
      examples:
        - id: P1
          status: RECEIVED
          receivedAt: 2026-11-10T19:09:04.352Z
          decision: RELEASE
          reasons:
            - code-missing
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
    DonationStatus:
      type: string
      enum:
        - AWAITING_APPROVAL
        - CONFIRMED
        - FAILED
      description: AWAITING_APPROVAL = waiting for the donor at PayPal; CONFIRMED =
        the money is reserved; FAILED = not approved.
      examples:
        - AWAITING_APPROVAL
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
info:
  title: ProofPay API
  version: 1.0.0
```