# Stripe Setup Guide (BATsols)

This walks you from zero Stripe account through accepting real card payments
on batsols.com. The code side is already built and waiting: `lib/stripe.ts`,
`app/api/checkout/route.ts`, and `app/api/webhooks/stripe/route.ts` all
check for Stripe keys at runtime. Until you add them, the site simply
offers Bank Transfer only, exactly as it does today. Nothing here requires
touching code - it is entirely account setup and environment variables.

Total time: about 20 minutes for test mode, plus however long Stripe takes
to review your business verification (often same day, sometimes a few
days) before you can take real money.

## Part 1: Test mode (do this first, no waiting)

Test mode lets you run the entire checkout end to end with fake card
numbers before any real money or business verification is involved.

### 1. Create your Stripe account

1. Go to [stripe.com](https://stripe.com) and click **Start now** / **Sign up**.
2. Use the email you want tied to the BATsols business (you can change
   this later, but it is simplest to use the real one now).
3. Verify your email when Stripe sends the confirmation link.
4. Stripe drops you straight into the Dashboard in **test mode** - you can
   see this from the "Test mode" toggle in the top right. You do not need
   to fill in any business details yet to use test mode.

### 2. Get your test API keys

1. In the Dashboard, go to **Developers → API keys** (or search "API
   keys" in the top search bar).
2. You will see two keys under test mode:
   - **Publishable key** - starts with `pk_test_...`
   - **Secret key** - starts with `sk_test_...` (click "Reveal test key")
3. Copy both. Never paste the secret key anywhere public - not GitHub, not
   Slack, not a screenshot.

### 3. Add the test keys to your local project

Open `.env.local` in the project (create it from `.env.example` if it
does not exist yet) and set:

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Leave `STRIPE_WEBHOOK_SECRET` blank for now - you will get that in step 5.
Restart `npm run dev` after saving so Next.js picks up the new variables.
"Card" should now appear as a payment option at `/checkout`, alongside
Bank Transfer.

### 4. Install the Stripe CLI (for local webhook testing)

The webhook is what tells your app a payment actually succeeded, so it
needs to reach your machine even while you are developing locally.

- **Mac**: `brew install stripe/stripe-cli/stripe`
- **Windows**: `scoop install stripe` (or download the .exe from
  [github.com/stripe/stripe-cli/releases](https://github.com/stripe/stripe-cli/releases))
- **Linux**: see the same releases page for a binary

Then authenticate it once:

```
stripe login
```

This opens a browser tab to link the CLI to your Stripe account.

### 5. Forward webhooks to your local server

With `npm run dev` running in one terminal, run this in another:

```
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

It prints a line like:

```
Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

Copy that `whsec_...` value into `.env.local` as `STRIPE_WEBHOOK_SECRET`,
then restart `npm run dev` again. Keep the `stripe listen` command running
in its own terminal the whole time you are testing - it is what actually
delivers the webhook event to your app.

### 6. Run a full test purchase

1. Go to `/store`, add something to your cart, and check out choosing
   **Card**.
2. On Stripe's hosted checkout page, use a test card:
   - Card number: `4242 4242 4242 4242`
   - Expiry: any future date (e.g. `12/34`)
   - CVC: any 3 digits (e.g. `123`)
   - ZIP: any 5 digits
3. Complete the payment. You should land on
   `/account/orders/[orderId]`, which polls automatically and flips
   from "Confirming your payment" to "Order confirmed" within a few
   seconds once the webhook lands.
4. Check the terminal running `stripe listen` - you should see a
   `checkout.session.completed` event logged, and your `/admin/orders`
   panel should show the order as **paid** with a license issued.

Other useful test cards (all use any future expiry/CVC/ZIP):
- `4000 0000 0000 9995` - always declines (tests your error handling)
- `4000 0025 0000 3155` - requires 3D Secure authentication

Once this works end to end, test mode is done - nothing more to configure
until you are ready to take real payments.

## Part 2: Going live (real payments)

### 7. Activate your Stripe account

1. In the Dashboard, click **Activate account** (banner at the top, or
   under Settings → Account details if you do not see the banner).
2. You will be asked for: legal business name and type (sole proprietor,
   LLC, etc.), business address, your bank account (for payouts), and
   basic details about what you sell. Have these ready before you start -
   Stripe's form does not save well if you leave mid-way.
3. Submit and wait for approval. This is usually near-instant to a few
   business days depending on your country and business type. You will
   get an email either way.
4. You can keep testing in test mode while this is pending - it does not
   block anything you already set up in Part 1.

### 8. Get your live API keys

Once activated, switch the Dashboard's "Test mode" toggle off, then go
back to **Developers → API keys**. You will see live equivalents:
`pk_live_...` and `sk_live_...`. Same rule as before: the secret key stays
secret.

### 9. Add live keys to Vercel (not `.env.local`)

Your local `.env.local` should keep the test keys - you do not want to
accidentally charge real cards while developing. The live keys go on
Vercel instead:

1. Vercel Dashboard → your project → **Settings → Environment Variables**.
2. Add for the **Production** environment:
   ```
   STRIPE_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```
3. Leave `STRIPE_WEBHOOK_SECRET` for the next step.

### 10. Create the production webhook

1. In the Stripe Dashboard (live mode), go to **Developers → Webhooks →
   Add endpoint**.
2. Endpoint URL: `https://yourdomain.com/api/webhooks/stripe` (use your
   real production domain).
3. Select the event to listen for: **`checkout.session.completed`**.
   That is the only event this app listens for - no need to add others.
4. Save, then click into the new endpoint and reveal its **Signing
   secret** (`whsec_...`).
5. Add that as `STRIPE_WEBHOOK_SECRET` in Vercel's Production environment
   variables, alongside the two keys from step 9.
6. Redeploy (push a commit, or use Vercel's "Redeploy" button) so the new
   environment variables take effect.

### 11. Verify it for real

1. Make one small real purchase yourself on the live site (a low-cost
   product, or a coupon-discounted one) using a real card.
2. Confirm the order shows paid on `/account/orders/[orderId]` and a
   license/download appears in your account.
3. Check **Developers → Webhooks** in the Stripe Dashboard - the endpoint
   should show a recent successful (200) delivery for
   `checkout.session.completed`.
4. Refund yourself from the Stripe Dashboard (Payments → find the
   charge → Refund) once you have confirmed it worked.

### Go-live checklist

- Business verification approved (step 7)
- Live keys in Vercel Production environment, not committed to git (step 9)
- Production webhook endpoint created and signing secret added (step 10)
- One real test purchase confirmed end-to-end, then refunded (step 11)
- Bank account added in Stripe for payouts (part of step 7)
- Decide your payout schedule (Stripe Dashboard → Settings → Payouts) -
  new accounts often start on a delayed schedule for the first few weeks

## Notes on how this app uses Stripe

- Card only appears at checkout when `STRIPE_SECRET_KEY` is set
  (`lib/stripe.ts`'s `isStripeConfigured()`); otherwise Bank Transfer is
  the only option shown, with no error.
- An order is only ever marked `paid` by the webhook handler
  (`app/api/webhooks/stripe/route.ts`) after Stripe confirms
  `checkout.session.completed` - never by the client, never by the
  checkout API response itself. This is what keeps a customer from being
  able to fake a paid order.
- The webhook handler verifies Stripe's signature
  (`stripe.webhooks.constructEvent`) before trusting any event, using
  `STRIPE_WEBHOOK_SECRET`. A request without a valid signature is
  rejected, so nobody can hit that endpoint directly to fake a payment.
- All prices are re-read from the database server-side at checkout
  (`app/api/checkout/route.ts`) - the client never gets to say what
  something costs.
