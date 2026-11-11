# Postman collection

`ProofPay.postman_collection.json` exercises the whole API, and the PayPal sandbox calls the app makes.
Two ready-made environments are included: `ProofPay.local.postman_environment.json`
(`http://localhost:3000`) and `ProofPay.hosted.postman_environment.json` (the hosted demo).

## Run it in Postman
1. Import the collection and one environment, and select that environment.
2. Run the folder **ProofPay API (run in order)**. Request 2 reads the demo project id, worker key and
   verifier key from the server, so there is nothing to fill in. Start a local demo with
   `npm run start:demo`.
3. Request 6 uploads `public/samples/stage1_before.png`. In Postman, set the working directory to this
   repository (Settings > Working directory) so the relative file path resolves, or re-select the file.

The run walks the real flow: a worker uploads evidence, a held case appears in the verifier queue, a wrong
evidence hash is refused, the right one releases the stage (each donor's exact share is captured and the worker
is paid), and the audit log's hash chain is verified. It also checks the safety rules: a wrong worker key
(403), a missing verifier key (401), a file that is not an image (415) and a bad project (400).

## Run it from the command line
With a local demo server running (`npm run start:demo`):

```bash
npm run test:api
```

This uses Newman (downloaded on demand by `npx`) and runs the same folder: 15 requests, 23 assertions.

A run changes state (stage 1 gets paid). Restart the demo server to reset it. Avoid running it against the
hosted demo while someone else is trying it: the hosted demo uses real Claude reviewers, and the run would
use up a stage.

## The PayPal folder
**PayPal sandbox (what the app calls)** replays the exact calls ProofPay makes: access token, an `AUTHORIZE`
order, authorize, two partial captures (`final_capture` false then true), the reservation's status, a payout,
and a payout status check. It needs your own sandbox app credentials in the environment
(`paypalClientId`, `paypalClientSecret`) and a sandbox Personal email as `workerEmail`. The sender must be a
US-based sandbox Business account, or Payouts answers `PAYOUT_NOT_AVAILABLE`. Only the sandbox URL is used.
Run P1 to P3 in order; between P2 and P3 open the printed `payer-action` link and approve as a sandbox donor.
