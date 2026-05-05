# Monetization Strategy - Avoiding App Store Fees

**Date:** 2026-05-04
**Purpose:** Document the App Store / Play Store fee structure, what is and is not allowed, and the specific pattern BottingOS uses to accept payment outside Apple's IAP system without getting rejected in review.

---

## 1. The decision

**BottingOS mobile is a free download.** All payment happens on the BottingOS website (or inside the desktop app), via Stripe or Paddle. The mobile app is unlocked via desktop pairing - no IAP, no in-app subscription, no upsell screens.

This is the **Reader app / Multiplatform Service** pattern, explicitly allowed by Apple guideline 3.1.3(b). Same pattern Notion, Linear, Tailscale, Spotify, Netflix, 1Password, Figma, GitHub, and most B2B SaaS use on iOS.

Net result: Apple takes 0% on subscription revenue, Google takes 0%, you keep 95-97% after Stripe / Paddle processing fees.

## 2. What Apple actually charges

Apple's 30% (or 15% for year-2 subscriptions and small businesses under $1M/year revenue) only applies to **In-App Purchases** of **digital goods or services consumed inside the app**.

Apple gets nothing on:

- Physical goods (Amazon, Uber Eats)
- B2B / enterprise services
- Services where the user already has an account from elsewhere (Reader apps - Netflix, Spotify, Kindle)
- Developer tools / API services where the user brings their own credentials
- Apps where money never flows through Apple's IAP system

If money never touches IAP, Apple gets nothing. This is not a loophole; it is the explicit design.

## 3. The pattern that works

1. App download is free.
2. App opens to a sign-in / pairing screen.
3. User signs up and pays on bottingos.com (Stripe / Paddle) - or pays inside the desktop app, which uses the same web checkout.
4. User logs into the mobile app (or scans the desktop's QR pairing code).
5. App is unlocked. Push notifications start working.

No "Subscribe" button anywhere in the iOS app. No "Buy Pro" upsell. No mention of pricing in the app at all. The app simply requires authentication; the user obtains their account elsewhere.

## 4. The five rules you have to follow or you get rejected

Apple's review team will reject your app if you trip any of these. Most of these are guideline 3.1.3 violations.

### 4.1 No payment flow inside the app

Not even a button that says "Subscribe at bottingos.com." The "anti-steering" rule prohibits this.

The Epic v Apple ruling (2024) cracked this open in the US - you can now apply for an "external link" entitlement that lets you put one such link in the app, and you pay 27% on those flows instead of 30%. Globally still mostly forbidden.

**Easiest path: don't reference money or subscriptions in the app at all.** Sign-in screen, pair-with-desktop screen, that's it.

### 4.2 No "save 30% by signing up on our website" language

Anywhere. App description on the App Store, marketing copy, in-app text, support pages linked from the app. Instant rejection under guideline 3.1.3.

The framing must be **"this is the mobile companion to the desktop app you already use,"** not **"sign up here to skip Apple's fees."**

### 4.3 The app must do something useful even before paid login, OR have a clear B2B / multiplatform-service framing

BottingOS qualifies on the multiplatform framing: "this is the mobile companion to the BottingOS desktop app you already have." Textbook 3.1.3(b).

If reviewers push back: emphasize that the desktop app is the primary product, mobile is a notification companion, and the user's account / payment exists in a multiplatform service.

### 4.4 Sign-in must be reasonably discoverable

No hiding it. Apple wants to know that someone who downloads the app from the store can actually use it. A clear sign-in screen with a "Don't have an account? Visit bottingos.com" line (no pricing!) is fine.

For BottingOS specifically: the QR-pairing flow is naturally discoverable - "open your desktop app, scan this code." No prose needed about how to get an account.

### 4.5 If you offer Sign in with Apple anywhere, you have to offer it on iOS

If your website has Sign in with Apple as one of its auth options, your iOS app must too. Easy to satisfy, free to add, and a good idea regardless.

## 5. Where it gets dicey

- **Pure consumer apps** that look like they're obviously circumventing IAP get extra scrutiny in review. BottingOS's B2B-ish framing ("operations dashboard for botters") helps. A "social photo app with BYO API key" gets rejected; "professional tool with desktop pairing" gets through.
- **Don't make the app useless without payment AND provide no path to pay AND mention pricing anywhere accessible from inside the app.** Reviewers connect those dots. Either provide a free/demo experience, or be unambiguously B2B/companion (BottingOS chooses the latter).
- **Apple changes rules.** Post-Epic, post-DMA in EU, the landscape is softening. But Apple has tightened in the past when one company got too clever in marketing. Don't be cute about advertising the savings.

## 6. Concrete revenue impact

At $3/mo subscription:

| Path | Net per user / month | Net at 1k users / mo | Net at 10k users / mo |
|---|---|---|---|
| Apple IAP, year 1 (30%) | $2.10 | $2,100 | $21,000 |
| Apple IAP, small biz program (15%) | $2.55 | $2,550 | $25,500 |
| Apple IAP, year 2+ (15%) | $2.55 | $2,550 | $25,500 |
| External link entitlement (27%) | $2.19 | $2,190 | $21,900 |
| Stripe direct on web (2.9% + $0.30) | $2.61 | $2,610 | $26,100 |
| Paddle MoR on web (5% all-in) | $2.85 | $2,850 | $28,500 |

**Stripe direct nets ~$250-700/mo more at 1k users than Apple IAP. ~$2.5k-7k/mo more at 10k users.** Real money, especially at low subscription prices where every dollar of margin matters.

Paddle nets even more after you account for VAT handling: Paddle is a Merchant of Record, so they handle EU/UK/global VAT for you. Stripe makes you handle that yourself (Stripe Tax is $0.50 per calculated transaction or 0.5% of revenue, whichever is lower). At any meaningful EU presence, Paddle wins on net margin.

## 7. The implementation

### 7.1 Mobile app (iOS + Android)

- Free download. No IAP product configured at all.
- Opens to a single sign-in / pairing screen.
- "Pair with desktop" QR scan flow is the primary auth path.
- "Sign in with email" as fallback (used for users who installed mobile first - but desktop is the primary intended flow).
- Sign in with Apple required if you offer it on web.
- No marketing copy about pricing, plans, features that require subscription, or anything that hints at "the mobile app is gated."

### 7.2 Web (bottingos.com)

- Subscription checkout via Stripe or Paddle.
- Stripe: lower fees (2.9% + $0.30), you handle VAT.
- Paddle: higher fees (5% all-in), Merchant of Record handles VAT.
- For BottingOS at low ticket size + global audience: **Paddle is probably the right call** despite higher fees, because VAT compliance otherwise eats your time and triggers tax filings in many jurisdictions.

### 7.3 Desktop app

- Same web checkout, opened in the user's default browser.
- After purchase, desktop app polls for license status via Supabase.
- Once licensed, generates the QR pairing code for mobile.

### 7.4 Auth + license flow

- License lives in Supabase, scoped to user account.
- Desktop signs in, gets a session token, can generate pairing codes.
- Pairing code = ephemeral one-time token that resolves to the user's account on the mobile side.
- Mobile receives session token + encryption key (per `mobile-architecture.md` section 8) and stores in Keychain / Keystore.

## 8. The "extra entitlement" path (later, not now)

Once you have meaningful conversion data, consider applying for Apple's external-link entitlement (StoreKit External Link Account entitlement). It lets you:

- Show one link in the app pointing to your billing page.
- Pay 27% on conversions through that link instead of 30%.
- Trade some margin for higher conversion (lower friction than "go to our website yourself").

Apple grants this if you qualify (B2B services, Reader apps, multiplatform services). BottingOS likely qualifies.

Worth doing once you have real numbers showing how many sign-ups die at the "go to website" step. Probably not worth doing in v1 - the friction filters non-serious users which is fine for a paid tool.

## 9. Google Play Store

Same story, slightly more permissive rules (Google formally allows alternative billing in some markets after the Epic ruling, and side-loading is always available). The strategy is identical:

- Free APK / Play Store install.
- Sign-in / pair-with-desktop flow.
- Payment on web.
- Net: ~95-97% margin via Stripe / Paddle.

If you do offer alternative billing on Play Store with Google's User Choice Billing, Google takes 26% instead of 30%. Same trade as Apple's external link entitlement.

## 10. What this is NOT

- **Not tax evasion.** You still owe income tax on revenue. This is about which payment processor / store takes a cut, not about hiding revenue.
- **Not a TOS violation.** This is the explicit design Apple's guidelines support for B2B / Reader / Multiplatform Service apps.
- **Not novel.** The exact pattern is documented in Apple's review guidelines and used by hundreds of legitimate businesses.
- **Not a guarantee against rejection.** Apple's review process is human and inconsistent. Following these rules cuts rejection risk to near zero, but appeals do happen. Have a written appeal ready ("BottingOS is a multiplatform operations service per guideline 3.1.3(b); the mobile app is a companion to the primary desktop product; account creation and payment are handled by the multiplatform service infrastructure").

## 11. Sources

- Apple App Store Review Guideline 3.1: <https://developer.apple.com/app-store/review/guidelines/#in-app-purchase>
- Apple "Reader App" and Multiplatform Service guideline 3.1.3(b): same page, section "External Links to Other Purchasing Methods"
- Apple Small Business Program (15% rate under $1M/yr): <https://developer.apple.com/app-store/small-business-program/>
- Apple StoreKit External Link Entitlement: <https://developer.apple.com/documentation/storekit/external_purchase>
- Epic v Apple ruling implications: court orders permit external links in US App Store as of January 2024.
- DMA in EU: alternative app stores, side-loading, alternative billing in iOS 17.4+ for EU users.
- Stripe pricing: <https://stripe.com/pricing>
- Paddle pricing and MoR explanation: <https://www.paddle.com/pricing>
- Google Play User Choice Billing: <https://support.google.com/googleplay/android-developer/answer/12570971>

## 12. Companions

- `cost-strategy.md` for infra cost / margin math at each scale.
- `mobile-architecture.md` for the pairing flow that makes this monetization model work.
