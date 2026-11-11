# Python SDK (/docs/sdks/python)

[Download SDK](/docs/__downloads/sdk/python.zip)

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

Add the SDK to your project from its folder, with whichever package manager your project uses. Give each tool a path containing a slash, such as `../proof-pay-api` — a bare folder name is looked up on PyPI instead, and resolves to whatever project holds that name there:

```bash
pip install <path-to-sdk>
```

```bash
uv add <path-to-sdk>
```

```bash
poetry add <path-to-sdk>
```

## Quick Start [#quick-start]

### Synchronous client [#synchronous-client]

Construct `ProofPayApiClient` with keyword arguments, and call `close()` when you are done. Every argument is optional.

```python
from proof_pay_api import ProofPayApiClient

client = ProofPayApiClient(
    worker_key="YOUR_API_KEY", verifier_key="YOUR_API_KEY", organizer_key="YOUR_API_KEY", environment="production"
)

client.close()
```

Alternatively, scope it — `with ProofPayApiClient(...) as client:` closes the pool on exit.

### Asynchronous client [#asynchronous-client]

`AsyncProofPayApiClient` mirrors `ProofPayApiClient` with **identical method names**, and every endpoint method is a coroutine. It takes the same arguments, with some differences — for example, the transport argument is `custom_async_http_client`.

```python
from asyncio import run

from proof_pay_api import AsyncProofPayApiClient

async def main() -> None:
    client = AsyncProofPayApiClient(
        worker_key="YOUR_API_KEY", verifier_key="YOUR_API_KEY", organizer_key="YOUR_API_KEY", environment="production"
    )
    await client.aclose()

run(main())
```

Alternatively, scope it — `async with AsyncProofPayApiClient(...) as client:` closes the pool on exit.