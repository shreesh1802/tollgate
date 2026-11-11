# PayPal return link (browser redirect) (/docs/api/openapi/donations/donationReturn)

`GET /api/donate/return`

PayPal sends the donor's browser here after approval with `?token=<order id>`. It confirms
the reservation and redirects back to the site. This is not meant to be called by an API client.


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
  /api/donate/return:
    get:
      tags:
        - Donations
      operationId: donationReturn
      summary: PayPal return link (browser redirect)
      description: >
        PayPal sends the donor's browser here after approval with `?token=<order
        id>`. It confirms

        the reservation and redirects back to the site. This is not meant to be
        called by an API client.
      parameters:
        - name: project
          in: query
          required: true
          schema:
            type: string
            description: Project id.
            examples:
              - P1
          description: Project id.
        - name: donation
          in: query
          required: true
          schema:
            type: string
            description: Donation id.
            examples:
              - D1
          description: Donation id.
        - name: token
          in: query
          required: true
          schema:
            type: string
            description: The PayPal order id.
            examples:
              - 5O190127
          description: The PayPal order id.
      responses:
        "302":
          description: Redirect to the project page (`donated=1`, or an `error=` value).
          headers:
            Location:
              schema:
                type: string
                description: A relative or absolute URL.
                examples:
                  - /?project=P1&donated=1
              description: Where the browser is sent next.
      x-apimatic-codeSamples:
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  client.donations.donation_return("P1", "D1", "5O190127")
              except ApiError as e:
                  ...  # TODO: Handle 'e.error' of type RawError
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                await client.donations.donationReturn({
                  project: "P1",
                  donation: "D1",
                  token: "5O190127",
                });
              } catch (err) {
                // TODO: Handle 'err' of type Donations.DonationReturnError, discriminated with 'err.payload.kind'
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