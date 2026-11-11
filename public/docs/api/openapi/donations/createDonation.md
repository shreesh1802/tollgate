# Reserve a donation on PayPal (/docs/api/openapi/donations/createDonation)

`POST /api/projects/{id}/donations`

Creates a PayPal order with intent AUTHORIZE: the money stays in the donor's account and
is only reserved. On the sandbox, send the donor to `approveUrl` to approve it; they are
then returned to the site and the reservation is confirmed. In mock mode there is no
approval step and the donation is confirmed immediately.


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
  /api/projects/{id}/donations:
    post:
      tags:
        - Donations
      operationId: createDonation
      summary: Reserve a donation on PayPal
      description: >
        Creates a PayPal order with intent AUTHORIZE: the money stays in the
        donor's account and

        is only reserved. On the sandbox, send the donor to `approveUrl` to
        approve it; they are

        then returned to the site and the reservation is confirmed. In mock mode
        there is no

        approval step and the donation is confirmed immediately.
      parameters:
        - $ref: "#/components/parameters/ProjectId"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - donor
                - amount
              properties:
                donor:
                  type: string
                  minLength: 1
                  maxLength: 60
                  description: The donor.
                  examples:
                    - Asha
                amount:
                  type: number
                  minimum: 1
                  maximum: 1000
                  multipleOf: 0.01
                  description: The amount.
                  examples:
                    - 25
              description: The create donation object.
            examples:
              default:
                value:
                  donor: Asha
                  amount: 25
        description: Who is donating and how much.
      responses:
        "201":
          description: Donation created.
          content:
            application/json:
              schema:
                type: object
                required:
                  - donationId
                  - status
                properties:
                  donationId:
                    type: string
                    description: The donation id.
                    examples:
                      - donationId
                  status:
                    $ref: "#/components/schemas/DonationStatus"
                  approveUrl:
                    type:
                      - string
                      - "null"
                    format: uri
                    description: Where the donor approves the reservation. Absent in mock mode.
                    examples:
                      - https://proofpay-on99.onrender.com
                description: The create donation object.
              examples:
                default:
                  value:
                    donationId: donationId
                    status: AWAITING_APPROVAL
                    approveUrl: https://proofpay-on99.onrender.com
        "400":
          $ref: "#/components/responses/BadRequest"
        "404":
          $ref: "#/components/responses/NotFound"
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.donations.create_donation(
                      "P1",
                      ApiProjectsDonationsRequest(
                          donor="Asha", amount=25
                      ),
                  )
                  # TODO: Handle 'response' of type
                  # ApiProjectsDonationsResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type CreateDonationErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.donations.createDonation({
                  id: "P1",
                  body: { donor: "Asha", amount: 25 },
                });
                // TODO: Handle 'response' of type ApiProjectsDonationsResponse
              } catch (err) {
                // TODO: Handle 'err' of type Donations.CreateDonationError, discriminated with 'err.payload.kind'
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