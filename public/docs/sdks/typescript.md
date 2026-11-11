# TypeScript SDK (/docs/sdks/typescript)

[Download SDK](/docs/__downloads/sdk/typescript.zip)

## Intro [#intro]

The ProofPay API SDK provides access to the [ProofPay API REST APIs](https://github.com/shreesh1802/tollgate).

ProofPay holds community donations in escrow on PayPal and releases each stage payment
only when photo evidence passes deterministic checks plus two independent AI reviewers.
Plain code makes the decision; a human verifier handles held cases; every step is written
to a hash-chained audit log.

**Who can call what**

| Role | How it identifies itself | Can do |
|---|---|---|
| Anyone | nothing | read projects and the audit log, donate |
| Worker | `X-Worker-Key` (returned when the project is created) | upload evidence, see the current one-time code |
| Verifier | `X-Verifier-Key` | read the review queue, approve or reject |
| Organiser | `X-Organizer-Key` (only if the server sets one) | create projects |

Money amounts are decimal strings or numbers in the project's currency (USD). The payee's
email address is never returned by any endpoint.

## Installation [#installation]

The SDK compiles to `dist/` before it can be referenced — run its `build` script once in the SDK folder, then add it to your project by path:

```bash
npm install <path-to-sdk>
```

## Quick Start [#quick-start]

Create one client and reuse it. Configure its behaviour through `ClientOptions`.

```ts
import { ProofPayApiClient, ServerEnvironment } from "proof-pay-api";

const client = new ProofPayApiClient({
  serverEnvironment: ServerEnvironment.Production,
  workerKey: "YOUR_API_KEY",
  verifierKey: "YOUR_API_KEY",
  organizerKey: "YOUR_API_KEY",
});
```

Nothing in `ClientOptions` is required — `new ProofPayApiClient()` compiles — and each option left out falls back to its default. `serverEnvironment` is spelled out above so the environment a call reaches is visible where the client is built rather than inherited silently.

### From CommonJS [#from-commonjs]

The package ships both dialects from a single entry, so `require` works with full types. In a TypeScript CommonJS file use the `import ... = require(...)` form — a plain destructuring `require` runs fine but gives you `any`.

```ts
import sdk = require("proof-pay-api");

const client = new sdk.ProofPayApiClient({
  serverEnvironment: sdk.ServerEnvironment.Production,
  workerKey: "YOUR_API_KEY",
  verifierKey: "YOUR_API_KEY",
  organizerKey: "YOUR_API_KEY",
});
```