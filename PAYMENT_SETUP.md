# One-Time Payment Setup Guide

Simple $19 one-time payment for lifetime unlimited snippets.

## ✅ What's Implemented

1. **Stripe Integration** - One-time payment checkout with Datafast revenue attribution
2. **Database Schema** - Simple payment tracking (has_paid boolean)
3. **Quota System** - Free: 50 snippets | Paid: Unlimited
4. **Webhook Handler** - Processes payment confirmations
5. **Billing UI** - Clean upgrade page at `/dashboard/billing`

## 🚀 Setup Steps

### 1. Run Database Migration

Copy contents of `supabase/add-stripe-one-time-payment.sql` and run in your Supabase SQL Editor:
https://supabase.com/dashboard/project/YOUR_PROJECT/sql

### 2. Set Up Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://snipt.app/api/webhooks/stripe`
3. Select these events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copy webhook signing secret (starts with `whsec_`)
5. Add to `.env.local`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ```

### 3. Connect Stripe to Datafast

1. Go to your Datafast dashboard
2. Connect your Stripe account under Integrations
3. Revenue attribution will work automatically (cookies are already passed in checkout)

## 🧪 Testing

### Local Testing

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Install Stripe CLI: https://stripe.com/docs/stripe-cli

3. Forward webhooks to local:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. Test payment with card: `4242 4242 4242 4242`

### Test Flow

1. Visit `http://localhost:3000/dashboard/billing`
2. Click "Upgrade Now"
3. Complete payment with test card
4. Get redirected back with success message
5. Verify:
   - Database: User's `has_paid` = true, `plan_tier` = 'pro'
   - Can create more than 50 snippets
   - Billing page shows "Unlimited Access"

## 📋 How It Works

### For Free Users (0-50 snippets)
- Can create up to 50 snippets
- When they try to create #51, they get: *"You've reached the limit of 50 snippets. Pay $19 once for unlimited snippets forever!"*
- They visit `/dashboard/billing` to upgrade

### After Payment
- User pays $19 once via Stripe Checkout
- Webhook processes `checkout.session.completed`
- Database updated: `has_paid = true`, `plan_tier = 'pro'`
- User immediately gets unlimited snippets
- No recurring billing, ever!

### Datafast Attribution
- Checkout automatically includes:
  - `datafast_visitor_id` cookie
  - `datafast_session_id` cookie
- Datafast tracks which marketing channel drove the $19 payment

## 🔧 Troubleshooting

### Webhook not working
- Check webhook secret is correct in `.env.local`
- For local testing, use Stripe CLI forwarding
- Check logs in Stripe Dashboard > Webhooks

### Payment succeeded but user still limited
- Check webhook received `checkout.session.completed` event
- Verify `has_paid` was set to `true` in database
- Check user's `plan_tier` was updated to 'pro'

### Datafast not showing revenue
- Ensure Stripe account is connected in Datafast
- Wait a few minutes for data to sync
- Check cookies are being set (browser DevTools > Application > Cookies)

## 💰 Pricing Structure

| Plan | Price | Snippets | Features |
|------|-------|----------|----------|
| Free | $0 | 50 | All features included |
| Unlimited | $19 one-time | ∞ | Lifetime access, no recurring fees |

## 📁 Key Files

- `app/api/payments/create-checkout/route.ts` - Creates $19 checkout session
- `app/api/webhooks/stripe/route.ts` - Processes payment webhooks
- `app/dashboard/billing/page.tsx` - Upgrade UI
- `lib/usage/quota.ts` - Enforces 50 snippet limit for free users
- `lib/stripe/payments.ts` - Payment recording utilities
- `supabase/add-stripe-one-time-payment.sql` - Database migration

## 🎉 You're Done!

Once you complete steps 1-3, your payment system is live:
- Free users get 50 snippets
- They can pay $19 once for unlimited
- Revenue is tracked in Datafast
- No subscriptions or recurring billing!
