# Secure, Monetization-Ready Subscription Architecture
*For HR Leave Assist (HRLA) using Bubble + Stripe + OpenAI API*

## 1. Core Principle (Anchor This)
* No subscription → no AI call.
* No jurisdiction → no answer.
* No limits → no scale safety.
* *Everything flows from this.*

## 2. System Components (Clean Separation)

### A. Frontend (Bubble UI)
* **Purpose:** User interaction only. Never trusted for enforcement.
* Login / account creation
* State selection (locked)
* Question input / Response display
* Usage warnings
* ❗ **Frontend never decides if a user can ask a question.**

### B. Backend Logic (Bubble Workflows)
* **Purpose:** Enforcement & control. This is where protection lives.
* Before every AI call, Bubble must verify:
    1.  User is authenticated
    2.  Subscription is **Active**
    3.  Jurisdiction is selected and locked
    4.  Usage limits not exceeded
    5.  Input passes basic safety checks
* If **any** check fails → **AI call never fires**.

### C. Payments (Stripe)
* **Purpose:** Access control, not billing elegance.
* Subscription plans (monthly / annual)
* Webhooks: `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated`
* Stripe → Bubble → access on/off
* **Stripe is the source of truth for paid status.**

### D. AI Layer (OpenAI API)
* **Purpose:** Controlled execution.
* System prompt stored **server-side**
* State module and "As of" date injected dynamically
* Guardrails enforced every request
* Users never see: Prompts, Instructions, Rule logic

## 3. Data Model (Minimal but Strong)

### User
* Email / Verified (yes/no)
* Subscription status
* Account role (user / admin)
* Jurisdiction (locked)
* Created date

### Subscription
* Stripe customer ID
* Plan type
* Status (active / past_due / canceled)
* Start / end date

### Usage Log (Critical)
* User / Date
* Questions used today
* Last request timestamp
* **Enables:** Soft throttling, Abuse detection, Easy audits

## 4. Request Flow (The Spine)
Every question follows this exact order:
1.  User submits question
2.  **Bubble backend checks:**
    * Logged in?
    * Subscription active?
    * Jurisdiction set?
    * Daily limit exceeded?
3.  If ❌ → show message, stop
4.  If ✅ → construct AI request (System prompt + Guardrails + User input)
5.  Call OpenAI API
6.  Increment usage counter
7.  Return response

## 5. Usage Limits (Abuse Control)
* **Baseline:** 20 questions/day included
* **Soft throttle (25):** Warning message, optional delay
* **Hard stop (30):** Block access until reset
* **Prevents:** Credential sharing, Department-wide use, Automation scraping

## 6. Jurisdiction Enforcement (Non-Negotiable)
* State selected at account creation and **locked**.
* Passed with every AI request.
* AI instructed: *“Answer only for the active jurisdiction. Do not compare or reference other states.”*
* Cross-state requests → Refusal + clarification prompt.

## 7. IP Protection & Legal Surface
* Prompts stored only in Bubble backend.
* No logic explanations in responses.
* **Required Pages:** Terms of Use, Privacy Policy, Disclaimer.
* **In-product notices:** "Decision-support only," "Do not enter sensitive personal data."

## 8. Admin Controls
* Disable user
* Reset usage counter
* Change subscription manually
* View basic usage

## Summary
HRLA should only answer questions for verified, paying users, within a locked jurisdiction, under enforced usage limits, using hidden logic you control. That’s a real product—not just a GPT.