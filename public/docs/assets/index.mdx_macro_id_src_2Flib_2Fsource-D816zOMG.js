import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{t}from"./jsx-runtime-LKYXHABd.js";var n=e(t()),r={title:`Welcome`,description:`The ProofPay API. Pay for community work only after it is proven.`},i=`ProofPay holds community donations in escrow on PayPal and releases each stage payment only when photo evidence passes deterministic checks plus two independent AI reviewers. Plain code makes the decision. A human verifier handles held cases, and every step goes into a hash-chained audit log.

This portal, the SDKs and the agent plugin are all generated from one OpenAPI spec, [\`openapi.yaml\`](https://github.com/shreesh1802/tollgate/blob/main/openapi.yaml), which a test keeps in sync with the real server.

## How a payment moves [#how-a-payment-moves]

1. **Reserve.** A donor creates a donation. PayPal authorizes it (\`intent: AUTHORIZE\`), so the money stays in their account.
2. **Prove.** The worker uploads a photo for the active stage with that stage's one-time code in it.
3. **Decide.** The gate checks for duplicates, location, time and the code, and asks two AI reviewers. It returns \`RELEASE\`, \`RESUBMIT\`, \`HOLD\` or \`BLOCK\`.
4. **Release.** On \`RELEASE\` each donor's exact share is captured and the worker is paid. On \`HOLD\` a human verifier decides.

## Who can call what [#who-can-call-what]

| Role | Header | Can do |
|---|---|---|
| Anyone | none | read projects and the audit log, donate |
| Worker | \`X-Worker-Key\` | upload evidence, see the active stage's code |
| Verifier | \`X-Verifier-Key\` | read the queue, approve or reject |

## Try it [#try-it]

The live demo runs simulated payments with real AI reviewers: [proofpay-on99.onrender.com](https://proofpay-on99.onrender.com).

<Cards>

<Card title="SDKs" href="/sdks">
Typed TypeScript and Python clients with authentication built in.
</Card>

<Card title="Agent-Friendly Docs" href="/llms.txt" external>
This documentation as Markdown, plus \`llms.txt\` and \`llms-full.txt\`, for AI agents.
</Card>

</Cards>
`,a={contents:[{heading:void 0,content:`ProofPay holds community donations in escrow on PayPal and releases each stage payment only when photo evidence passes deterministic checks plus two independent AI reviewers. Plain code makes the decision. A human verifier handles held cases, and every step goes into a hash-chained audit log.`},{heading:void 0,content:"This portal, the SDKs and the agent plugin are all generated from one OpenAPI spec, `openapi.yaml`, which a test keeps in sync with the real server."},{heading:`how-a-payment-moves`,content:"**Reserve.** A donor creates a donation. PayPal authorizes it (`intent: AUTHORIZE`), so the money stays in their account."},{heading:`how-a-payment-moves`,content:`**Prove.** The worker uploads a photo for the active stage with that stage's one-time code in it.`},{heading:`how-a-payment-moves`,content:"**Decide.** The gate checks for duplicates, location, time and the code, and asks two AI reviewers. It returns `RELEASE`, `RESUBMIT`, `HOLD` or `BLOCK`."},{heading:`how-a-payment-moves`,content:"**Release.** On `RELEASE` each donor's exact share is captured and the worker is paid. On `HOLD` a human verifier decides."},{heading:`who-can-call-what`,content:`| Role   | Header | Can do                                  |
| ------ | ------ | --------------------------------------- |
| Anyone | none   | read projects and the audit log, donate |`,table:`table-0`},{heading:`who-can-call-what`,content:`| Role   | Header         | Can do                                       |
| ------ | -------------- | -------------------------------------------- |
| Worker | \`X-Worker-Key\` | upload evidence, see the active stage's code |`,table:`table-0`},{heading:`who-can-call-what`,content:`| Role     | Header           | Can do                            |
| -------- | ---------------- | --------------------------------- |
| Verifier | \`X-Verifier-Key\` | read the queue, approve or reject |`,table:`table-0`},{heading:`try-it`,content:`The live demo runs simulated payments with real AI reviewers: proofpay-on99.onrender.com.`},{heading:`try-it`,content:`Typed TypeScript and Python clients with authentication built in.`},{heading:`try-it`,content:"This documentation as Markdown, plus `llms.txt` and `llms-full.txt`, for AI agents."}],headings:[{id:`how-a-payment-moves`,content:`How a payment moves`},{id:`who-can-call-what`,content:`Who can call what`},{id:`try-it`,content:`Try it`}]},o=[{depth:2,url:`#how-a-payment-moves`,title:(0,n.jsx)(n.Fragment,{children:`How a payment moves`})},{depth:2,url:`#who-can-call-what`,title:(0,n.jsx)(n.Fragment,{children:`Who can call what`})},{depth:2,url:`#try-it`,title:(0,n.jsx)(n.Fragment,{children:`Try it`})}];function s(e){let t={a:`a`,code:`code`,h2:`h2`,li:`li`,ol:`ol`,p:`p`,strong:`strong`,table:`table`,tbody:`tbody`,td:`td`,th:`th`,thead:`thead`,tr:`tr`,...e.components},{Card:r,Cards:i}=t;return r||l(`Card`,!0),i||l(`Cards`,!0),(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(t.p,{children:`ProofPay holds community donations in escrow on PayPal and releases each stage payment only when photo evidence passes deterministic checks plus two independent AI reviewers. Plain code makes the decision. A human verifier handles held cases, and every step goes into a hash-chained audit log.`}),`
`,(0,n.jsxs)(t.p,{children:[`This portal, the SDKs and the agent plugin are all generated from one OpenAPI spec, `,(0,n.jsx)(t.a,{href:`https://github.com/shreesh1802/tollgate/blob/main/openapi.yaml`,children:(0,n.jsx)(t.code,{children:`openapi.yaml`})}),`, which a test keeps in sync with the real server.`]}),`
`,(0,n.jsx)(t.h2,{id:`how-a-payment-moves`,children:`How a payment moves`}),`
`,(0,n.jsxs)(t.ol,{children:[`
`,(0,n.jsxs)(t.li,{children:[(0,n.jsx)(t.strong,{children:`Reserve.`}),` A donor creates a donation. PayPal authorizes it (`,(0,n.jsx)(t.code,{children:`intent: AUTHORIZE`}),`), so the money stays in their account.`]}),`
`,(0,n.jsxs)(t.li,{children:[(0,n.jsx)(t.strong,{children:`Prove.`}),` The worker uploads a photo for the active stage with that stage's one-time code in it.`]}),`
`,(0,n.jsxs)(t.li,{children:[(0,n.jsx)(t.strong,{children:`Decide.`}),` The gate checks for duplicates, location, time and the code, and asks two AI reviewers. It returns `,(0,n.jsx)(t.code,{children:`RELEASE`}),`, `,(0,n.jsx)(t.code,{children:`RESUBMIT`}),`, `,(0,n.jsx)(t.code,{children:`HOLD`}),` or `,(0,n.jsx)(t.code,{children:`BLOCK`}),`.`]}),`
`,(0,n.jsxs)(t.li,{children:[(0,n.jsx)(t.strong,{children:`Release.`}),` On `,(0,n.jsx)(t.code,{children:`RELEASE`}),` each donor's exact share is captured and the worker is paid. On `,(0,n.jsx)(t.code,{children:`HOLD`}),` a human verifier decides.`]}),`
`]}),`
`,(0,n.jsx)(t.h2,{id:`who-can-call-what`,children:`Who can call what`}),`
`,(0,n.jsxs)(t.table,{children:[(0,n.jsx)(t.thead,{children:(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.th,{children:`Role`}),(0,n.jsx)(t.th,{children:`Header`}),(0,n.jsx)(t.th,{children:`Can do`})]})}),(0,n.jsxs)(t.tbody,{children:[(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:`Anyone`}),(0,n.jsx)(t.td,{children:`none`}),(0,n.jsx)(t.td,{children:`read projects and the audit log, donate`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:`Worker`}),(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`X-Worker-Key`})}),(0,n.jsx)(t.td,{children:`upload evidence, see the active stage's code`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:`Verifier`}),(0,n.jsx)(t.td,{children:(0,n.jsx)(t.code,{children:`X-Verifier-Key`})}),(0,n.jsx)(t.td,{children:`read the queue, approve or reject`})]})]})]}),`
`,(0,n.jsx)(t.h2,{id:`try-it`,children:`Try it`}),`
`,(0,n.jsxs)(t.p,{children:[`The live demo runs simulated payments with real AI reviewers: `,(0,n.jsx)(t.a,{href:`https://proofpay-on99.onrender.com`,children:`proofpay-on99.onrender.com`}),`.`]}),`
`,(0,n.jsxs)(i,{children:[(0,n.jsx)(r,{title:`SDKs`,href:`/sdks`,children:(0,n.jsx)(t.p,{children:`Typed TypeScript and Python clients with authentication built in.`})}),(0,n.jsx)(r,{title:`Agent-Friendly Docs`,href:`/llms.txt`,external:!0,children:(0,n.jsxs)(t.p,{children:[`This documentation as Markdown, plus `,(0,n.jsx)(t.code,{children:`llms.txt`}),` and `,(0,n.jsx)(t.code,{children:`llms-full.txt`}),`, for AI agents.`]})})]})]})}function c(e={}){let{wrapper:t}=e.components||{};return t?(0,n.jsx)(t,{...e,children:(0,n.jsx)(s,{...e})}):s(e)}function l(e,t){throw Error(`Expected `+(t?`component`:`object`)+" `"+e+"` to be defined: you likely forgot to import, pass, or provide it.")}export{i as _markdown,c as default,r as frontmatter,a as structuredData,o as toc};