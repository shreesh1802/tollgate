# Create a project (/docs/api/openapi/projects/createProject)

`POST /api/projects`

Stage percentages must add up to 100. Each stage has a time window in which its evidence
must be photographed. The response contains the worker key; keep it, it is shown once.


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
    post:
      tags:
        - Projects
      operationId: createProject
      summary: Create a project
      description: >
        Stage percentages must add up to 100. Each stage has a time window in
        which its evidence

        must be photographed. The response contains the worker key; keep it, it
        is shown once.
      security:
        - {}
        - OrganizerKey: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/NewProject"
            examples:
              default:
                value:
                  title: Repair the village hand pump
                  worker:
                    name: Ravi Kumar
                    email: ravi@example.com
                  site:
                    lat: 12.9716
                    lon: 77.5946
                    radiusM: 150
                  stages:
                    - title: Repair the village hand pump
                      spec: The new pump head is installed and bolted to the base.
                      pct: 40
                      window:
                        from: 2026-11-01T00:00:00Z
                        to: 2026-11-30T23:59:59Z
        description: The project to create.
      responses:
        "201":
          description: Project created.
          content:
            application/json:
              schema:
                type: object
                required:
                  - id
                  - workerKey
                  - workerLink
                properties:
                  id:
                    type: string
                    description: The id.
                    examples:
                      - id
                  workerKey:
                    type: string
                    description: The worker key.
                    examples:
                      - workerKey
                  workerLink:
                    type: string
                    format: uri
                    description: A link that opens the worker page already signed in.
                    examples:
                      - https://proofpay-on99.onrender.com
                description: The create project object.
              examples:
                default:
                  value:
                    id: id
                    workerKey: workerKey
                    workerLink: https://proofpay-on99.onrender.com
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "429":
          description: The hosted demo has reached its project limit.
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
            Example: >-
              try:
                  response = client.projects.create_project(
                      NewProject(
                          title="Repair the village hand pump",
                          worker=Worker(
                              name="Ravi Kumar", email="ravi@example.com"
                          ),
                          site=Site(
                              lat=12.9716, lon=77.5946, radius_m=150
                          ),
                          stages=[
                              NewStage(
                                  title="Repair the village hand pump",
                                  spec="The new pump head is installed and bolted to the base.",
                                  pct=40,
                                  window=TimeWindow(
                                      from_=datetime(
                                          2026,
                                          11,
                                          1,
                                          0,
                                          0,
                                          0,
                                          tzinfo=timezone.utc,
                                      ),
                                      to=datetime(
                                          2026,
                                          11,
                                          30,
                                          23,
                                          59,
                                          59,
                                          tzinfo=timezone.utc,
                                      ),
                                  ),
                              ),
                          ],
                      ),
                  )
                  # TODO: Handle 'response' of type ApiProjectsResponse
              except ApiError as e:
                  # TODO: Handle 'e.error' of type CreateProjectErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.projects.createProject({
                  body: {
                    title: "Repair the village hand pump",
                    worker: {
                      name: "Ravi Kumar",
                      email: "ravi@example.com",
                    },
                    site: { lat: 12.9716, lon: 77.5946, radiusM: 150 },
                    stages: [
                      {
                        title: "Repair the village hand pump",
                        spec: "The new pump head is installed and bolted to the base.",
                        pct: 40,
                        window: {
                          from: new Date(Date.UTC(2026, 10, 1, 0, 0, 0)),
                          to: new Date(
                            Date.UTC(2026, 10, 30, 23, 59, 59),
                          ),
                        },
                      },
                    ],
                  },
                });
                // TODO: Handle 'response' of type ApiProjectsResponse
              } catch (err) {
                // TODO: Handle 'err' of type Projects.CreateProjectError, discriminated with 'err.payload.kind'
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
    NewProject:
      type: object
      required:
        - title
        - worker
        - site
        - stages
      properties:
        title:
          type: string
          maxLength: 100
          description: Short human-readable title.
          examples:
            - Repair the village hand pump
        worker:
          type: object
          required:
            - name
            - email
          properties:
            name:
              type: string
              description: Full name.
              examples:
                - Ravi Kumar
            email:
              type: string
              format: email
              description: The PayPal account that gets paid. Never published.
              examples:
                - ravi@example.com
          description: The person who does the work and gets paid.
          examples:
            - name: Ravi Kumar
              email: ravi@example.com
        site:
          $ref: "#/components/schemas/Site"
        stages:
          type: array
          minItems: 1
          maxItems: 8
          items:
            $ref: "#/components/schemas/NewStage"
          description: The stages of the project, in order.
          examples:
            - - title: Repair the village hand pump
                spec: The new pump head is installed and bolted to the base.
                pct: 40
                window:
                  from: 2026-11-01T00:00:00Z
                  to: 2026-11-30T23:59:59Z
      description: The new project object.
      examples:
        - title: Repair the village hand pump
          worker:
            name: Ravi Kumar
            email: ravi@example.com
          site:
            lat: 12.9716
            lon: 77.5946
            radiusM: 150
          stages:
            - title: Repair the village hand pump
              spec: The new pump head is installed and bolted to the base.
              pct: 40
              window:
                from: 2026-11-01T00:00:00Z
                to: 2026-11-30T23:59:59Z
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
    NewStage:
      type: object
      required:
        - title
        - spec
        - pct
        - window
      properties:
        title:
          type: string
          description: Short human-readable title.
          examples:
            - Repair the village hand pump
        spec:
          type: string
          description: What the photo must show. The AI reviewers judge against this.
          examples:
            - The new pump head is installed and bolted to the base.
        pct:
          type: integer
          minimum: 1
          description: Share of the total released at this stage. All stages must sum to
            100.
          examples:
            - 40
        window:
          $ref: "#/components/schemas/TimeWindow"
      description: The new stage object.
      examples:
        - title: Repair the village hand pump
          spec: The new pump head is installed and bolted to the base.
          pct: 40
          window:
            from: 2026-11-01T00:00:00Z
            to: 2026-11-30T23:59:59Z
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