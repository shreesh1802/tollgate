import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{t}from"./jsx-runtime-LKYXHABd.js";import{n,t as r}from"./server.browser-CRtpYEZZ.js";var i=e(t()),a={title:`Python SDK`,description:`Install and start using the Python SDK.`};function o(e){if(!r())return null;let t=n(e.components);return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(t.SdkActions,{download:`/__downloads/sdk/python.zip`,source:``,packageUrl:``,registry:``}),`

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
| Worker | \`X-Worker-Key\` (returned when the project is created) | upload evidence, see the current one-time code |
| Verifier | \`X-Verifier-Key\` | read the review queue, approve or reject |
| Organiser | \`X-Organizer-Key\` (only if the server sets one) | create projects |

Money amounts are decimal strings or numbers in the project's currency (USD). The payee's
email address is never returned by any endpoint.

## Installation [#installation]

Add the SDK to your project from its folder, with whichever package manager your project uses. Give each tool a path containing a slash, such as \`../proof-pay-api\` — a bare folder name is looked up on PyPI instead, and resolves to whatever project holds that name there:

\`\`\`bash
pip install <path-to-sdk>
\`\`\`

\`\`\`bash
uv add <path-to-sdk>
\`\`\`

\`\`\`bash
poetry add <path-to-sdk>
\`\`\`

## Quick Start [#quick-start]

### Synchronous client [#synchronous-client]

Construct \`ProofPayApiClient\` with keyword arguments, and call \`close()\` when you are done. Every argument is optional.

\`\`\`python
from proof_pay_api import ProofPayApiClient

client = ProofPayApiClient(
    worker_key="YOUR_API_KEY", verifier_key="YOUR_API_KEY", organizer_key="YOUR_API_KEY", environment="production"
)

client.close()
\`\`\`

Alternatively, scope it — \`with ProofPayApiClient(...) as client:\` closes the pool on exit.

### Asynchronous client [#asynchronous-client]

\`AsyncProofPayApiClient\` mirrors \`ProofPayApiClient\` with **identical method names**, and every endpoint method is a coroutine. It takes the same arguments, with some differences — for example, the transport argument is \`custom_async_http_client\`.

\`\`\`python
from asyncio import run

from proof_pay_api import AsyncProofPayApiClient


async def main() -> None:
    client = AsyncProofPayApiClient(
        worker_key="YOUR_API_KEY", verifier_key="YOUR_API_KEY", organizer_key="YOUR_API_KEY", environment="production"
    )
    await client.aclose()


run(main())
\`\`\`

Alternatively, scope it — \`async with AsyncProofPayApiClient(...) as client:\` closes the pool on exit.
`]})}var s={contents:[{heading:`intro`,content:`The ProofPay API SDK provides access to the ProofPay API REST APIs.`},{heading:`intro`,content:`ProofPay holds community donations in escrow on PayPal and releases each stage payment
only when photo evidence passes deterministic checks plus two independent AI reviewers.
Plain code makes the decision; a human verifier handles held cases; every step is written
to a hash-chained audit log.`},{heading:`intro`,content:`**Who can call what**`},{heading:`intro`,content:`| Role   | How it identifies itself | Can do                                  |
| ------ | ------------------------ | --------------------------------------- |
| Anyone | nothing                  | read projects and the audit log, donate |`,table:`table-0`},{heading:`intro`,content:`| Role   | How it identifies itself                              | Can do                                         |
| ------ | ----------------------------------------------------- | ---------------------------------------------- |
| Worker | \`X-Worker-Key\` (returned when the project is created) | upload evidence, see the current one-time code |`,table:`table-0`},{heading:`intro`,content:`| Role     | How it identifies itself | Can do                                   |
| -------- | ------------------------ | ---------------------------------------- |
| Verifier | \`X-Verifier-Key\`         | read the review queue, approve or reject |`,table:`table-0`},{heading:`intro`,content:`| Role      | How it identifies itself                        | Can do          |
| --------- | ----------------------------------------------- | --------------- |
| Organiser | \`X-Organizer-Key\` (only if the server sets one) | create projects |`,table:`table-0`},{heading:`intro`,content:`Money amounts are decimal strings or numbers in the project's currency (USD). The payee's
email address is never returned by any endpoint.`},{heading:`installation`,content:"Add the SDK to your project from its folder, with whichever package manager your project uses. Give each tool a path containing a slash, such as `../proof-pay-api` — a bare folder name is looked up on PyPI instead, and resolves to whatever project holds that name there:"},{heading:`synchronous-client`,content:"Construct `ProofPayApiClient` with keyword arguments, and call `close()` when you are done. Every argument is optional."},{heading:`synchronous-client`,content:"Alternatively, scope it — `with ProofPayApiClient(...) as client:` closes the pool on exit."},{heading:`asynchronous-client`,content:"`AsyncProofPayApiClient` mirrors `ProofPayApiClient` with **identical method names**, and every endpoint method is a coroutine. It takes the same arguments, with some differences — for example, the transport argument is `custom_async_http_client`."},{heading:`asynchronous-client`,content:"Alternatively, scope it — `async with AsyncProofPayApiClient(...) as client:` closes the pool on exit."}],headings:[{id:`intro`,content:`Intro`},{id:`installation`,content:`Installation`},{id:`quick-start`,content:`Quick Start`},{id:`synchronous-client`,content:`Synchronous client`},{id:`asynchronous-client`,content:`Asynchronous client`}]},c=[{depth:2,url:`#intro`,title:(0,i.jsx)(i.Fragment,{children:`Intro`})},{depth:2,url:`#installation`,title:(0,i.jsx)(i.Fragment,{children:`Installation`})},{depth:2,url:`#quick-start`,title:(0,i.jsx)(i.Fragment,{children:`Quick Start`})},{depth:3,url:`#synchronous-client`,title:(0,i.jsx)(i.Fragment,{children:`Synchronous client`})},{depth:3,url:`#asynchronous-client`,title:(0,i.jsx)(i.Fragment,{children:`Asynchronous client`})}];function l(e){let t={a:`a`,code:`code`,h2:`h2`,h3:`h3`,p:`p`,pre:`pre`,span:`span`,strong:`strong`,table:`table`,tbody:`tbody`,td:`td`,th:`th`,thead:`thead`,tr:`tr`,...e.components},{SdkActions:n}=t;return n||d(`SdkActions`,!0),(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(n,{download:`/__downloads/sdk/python.zip`,source:``,packageUrl:``,registry:``}),`
`,(0,i.jsx)(t.h2,{id:`intro`,children:`Intro`}),`
`,(0,i.jsxs)(t.p,{children:[`The ProofPay API SDK provides access to the `,(0,i.jsx)(t.a,{href:`https://github.com/shreesh1802/tollgate`,children:`ProofPay API REST APIs`}),`.`]}),`
`,(0,i.jsx)(t.p,{children:`ProofPay holds community donations in escrow on PayPal and releases each stage payment
only when photo evidence passes deterministic checks plus two independent AI reviewers.
Plain code makes the decision; a human verifier handles held cases; every step is written
to a hash-chained audit log.`}),`
`,(0,i.jsx)(t.p,{children:(0,i.jsx)(t.strong,{children:`Who can call what`})}),`
`,(0,i.jsxs)(t.table,{children:[(0,i.jsx)(t.thead,{children:(0,i.jsxs)(t.tr,{children:[(0,i.jsx)(t.th,{children:`Role`}),(0,i.jsx)(t.th,{children:`How it identifies itself`}),(0,i.jsx)(t.th,{children:`Can do`})]})}),(0,i.jsxs)(t.tbody,{children:[(0,i.jsxs)(t.tr,{children:[(0,i.jsx)(t.td,{children:`Anyone`}),(0,i.jsx)(t.td,{children:`nothing`}),(0,i.jsx)(t.td,{children:`read projects and the audit log, donate`})]}),(0,i.jsxs)(t.tr,{children:[(0,i.jsx)(t.td,{children:`Worker`}),(0,i.jsxs)(t.td,{children:[(0,i.jsx)(t.code,{children:`X-Worker-Key`}),` (returned when the project is created)`]}),(0,i.jsx)(t.td,{children:`upload evidence, see the current one-time code`})]}),(0,i.jsxs)(t.tr,{children:[(0,i.jsx)(t.td,{children:`Verifier`}),(0,i.jsx)(t.td,{children:(0,i.jsx)(t.code,{children:`X-Verifier-Key`})}),(0,i.jsx)(t.td,{children:`read the review queue, approve or reject`})]}),(0,i.jsxs)(t.tr,{children:[(0,i.jsx)(t.td,{children:`Organiser`}),(0,i.jsxs)(t.td,{children:[(0,i.jsx)(t.code,{children:`X-Organizer-Key`}),` (only if the server sets one)`]}),(0,i.jsx)(t.td,{children:`create projects`})]})]})]}),`
`,(0,i.jsx)(t.p,{children:`Money amounts are decimal strings or numbers in the project's currency (USD). The payee's
email address is never returned by any endpoint.`}),`
`,(0,i.jsx)(t.h2,{id:`installation`,children:`Installation`}),`
`,(0,i.jsxs)(t.p,{children:[`Add the SDK to your project from its folder, with whichever package manager your project uses. Give each tool a path containing a slash, such as `,(0,i.jsx)(t.code,{children:`../proof-pay-api`}),` — a bare folder name is looked up on PyPI instead, and resolves to whatever project holds that name there:`]}),`
`,(0,i.jsx)(i.Fragment,{children:(0,i.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,title:`Terminal`,children:(0,i.jsx)(t.code,{children:(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`pip`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` install`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` <`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:`path-to-sd`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`k`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`>`})]})})})}),`
`,(0,i.jsx)(i.Fragment,{children:(0,i.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,title:`Terminal`,children:(0,i.jsx)(t.code,{children:(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uv`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` add`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` <`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:`path-to-sd`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`k`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`>`})]})})})}),`
`,(0,i.jsx)(i.Fragment,{children:(0,i.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,title:`Terminal`,children:(0,i.jsx)(t.code,{children:(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`poetry`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` add`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` <`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:`path-to-sd`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`k`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`>`})]})})})}),`
`,(0,i.jsx)(t.h2,{id:`quick-start`,children:`Quick Start`}),`
`,(0,i.jsx)(t.h3,{id:`synchronous-client`,children:`Synchronous client`}),`
`,(0,i.jsxs)(t.p,{children:[`Construct `,(0,i.jsx)(t.code,{children:`ProofPayApiClient`}),` with keyword arguments, and call `,(0,i.jsx)(t.code,{children:`close()`}),` when you are done. Every argument is optional.`]}),`
`,(0,i.jsx)(i.Fragment,{children:(0,i.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,title:`Python`,children:(0,i.jsxs)(t.code,{children:[(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`from`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:` proof_pay_api `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`import`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:` ProofPayApiClient`})]}),`
`,(0,i.jsx)(t.span,{className:`line`}),`
`,(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`client `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`=`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:` ProofPayApiClient(`})]}),`
`,(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#E36209`,"--shiki-dark":`#FFAB70`},children:`    worker_key`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`=`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:`"YOUR_API_KEY"`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`, `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#E36209`,"--shiki-dark":`#FFAB70`},children:`verifier_key`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`=`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:`"YOUR_API_KEY"`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`, `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#E36209`,"--shiki-dark":`#FFAB70`},children:`organizer_key`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`=`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:`"YOUR_API_KEY"`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`, `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#E36209`,"--shiki-dark":`#FFAB70`},children:`environment`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`=`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:`"production"`})]}),`
`,(0,i.jsx)(t.span,{className:`line`,children:(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`)`})}),`
`,(0,i.jsx)(t.span,{className:`line`}),`
`,(0,i.jsx)(t.span,{className:`line`,children:(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`client.close()`})})]})})}),`
`,(0,i.jsxs)(t.p,{children:[`Alternatively, scope it — `,(0,i.jsx)(t.code,{children:`with ProofPayApiClient(...) as client:`}),` closes the pool on exit.`]}),`
`,(0,i.jsx)(t.h3,{id:`asynchronous-client`,children:`Asynchronous client`}),`
`,(0,i.jsxs)(t.p,{children:[(0,i.jsx)(t.code,{children:`AsyncProofPayApiClient`}),` mirrors `,(0,i.jsx)(t.code,{children:`ProofPayApiClient`}),` with `,(0,i.jsx)(t.strong,{children:`identical method names`}),`, and every endpoint method is a coroutine. It takes the same arguments, with some differences — for example, the transport argument is `,(0,i.jsx)(t.code,{children:`custom_async_http_client`}),`.`]}),`
`,(0,i.jsx)(i.Fragment,{children:(0,i.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,title:`Python`,children:(0,i.jsxs)(t.code,{children:[(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`from`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:` asyncio `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`import`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:` run`})]}),`
`,(0,i.jsx)(t.span,{className:`line`}),`
`,(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`from`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:` proof_pay_api `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`import`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:` AsyncProofPayApiClient`})]}),`
`,(0,i.jsx)(t.span,{className:`line`}),`
`,(0,i.jsx)(t.span,{className:`line`}),`
`,(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`async`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` def`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:` main`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`() -> `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:`None`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`:`})]}),`
`,(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`    client `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`=`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:` AsyncProofPayApiClient(`})]}),`
`,(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#E36209`,"--shiki-dark":`#FFAB70`},children:`        worker_key`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`=`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:`"YOUR_API_KEY"`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`, `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#E36209`,"--shiki-dark":`#FFAB70`},children:`verifier_key`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`=`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:`"YOUR_API_KEY"`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`, `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#E36209`,"--shiki-dark":`#FFAB70`},children:`organizer_key`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`=`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:`"YOUR_API_KEY"`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`, `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#E36209`,"--shiki-dark":`#FFAB70`},children:`environment`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`=`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:`"production"`})]}),`
`,(0,i.jsx)(t.span,{className:`line`,children:(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`    )`})}),`
`,(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`    await`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:` client.aclose()`})]}),`
`,(0,i.jsx)(t.span,{className:`line`}),`
`,(0,i.jsx)(t.span,{className:`line`}),`
`,(0,i.jsx)(t.span,{className:`line`,children:(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`run(main())`})})]})})}),`
`,(0,i.jsxs)(t.p,{children:[`Alternatively, scope it — `,(0,i.jsx)(t.code,{children:`async with AsyncProofPayApiClient(...) as client:`}),` closes the pool on exit.`]})]})}function u(e={}){let{wrapper:t}=e.components||{};return t?(0,i.jsx)(t,{...e,children:(0,i.jsx)(l,{...e})}):l(e)}function d(e,t){throw Error(`Expected `+(t?`component`:`object`)+" `"+e+"` to be defined: you likely forgot to import, pass, or provide it.")}export{o as _markdown,u as default,a as frontmatter,s as structuredData,c as toc};