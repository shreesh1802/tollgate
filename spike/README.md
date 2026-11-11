# PayPal sandbox spike

Answers one question before we build on it: **can we reserve a donor's money, capture it in two
parts, and pay a worker, all in the PayPal sandbox?**

## One-time setup (about 10 minutes)

1. Log in at https://developer.paypal.com/dashboard/ with your PayPal account.
2. **Testing tools -> Sandbox accounts.** You need three, and **all of them should be set to the
   United States**. (A Business account in some countries, for example India, cannot send
   Payouts: PayPal answers `PAYOUT_NOT_AVAILABLE`. Donors in other countries can also hit
   "seller does not accept payments in your currency".)
   - a **Business** account (the platform that receives and pays out). The default one may be in
     another country, so check its Country column and create a US one if needed.
   - a **Personal** account for the **donor**.
   - a **Personal** account for the **worker** (note its email).
3. **Apps & Credentials -> Sandbox -> Create App** (or use the default app), owned by the Business
   account. Copy the **Client ID** and **Secret**.
4. In this folder run `cp .env.example .env` and fill in the two values. `.env` is gitignored. Never commit it.
5. For payouts: the Business account needs a balance (captures provide it) and Payouts access.
   The docs say you can test in sandbox while access approval is pending.

## Run it

```
node --env-file=.env spike/paypal-spike.js create 10.00
#   open the printed link, log in as the DONOR sandbox account, approve
node --env-file=.env spike/paypal-spike.js authorize
node --env-file=.env spike/paypal-spike.js capture 4.00
node --env-file=.env spike/paypal-spike.js status
node --env-file=.env spike/paypal-spike.js capture 6.00 final
node --env-file=.env spike/paypal-spike.js payout <worker-sandbox-email> 3.00
```

## What a pass looks like

- After `authorize`: status `CREATED`, with an expiration time.
- After `capture 4.00`: capture `COMPLETED`, authorization `PARTIALLY_CAPTURED`.
- After `capture 6.00 final`: authorization `CAPTURED`.
- After `payout`: batch `PENDING` or `SUCCESS`, item `SUCCESS` (or `UNCLAIMED` if the email has no sandbox account).

If any step fails, the full PayPal error and its debug id are printed. Paste that (never the secret) and we adjust.

Every call is summarised in `spike/spike-log.json` (status codes and ids only). Secrets and tokens are never logged.
