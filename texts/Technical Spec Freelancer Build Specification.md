# HR Leave Assist (HRLA) – Freelancer Build Specification

**Purpose:** Implement secure, subscription-gated access to HRLA using Bubble, Stripe, and OpenAI API.

### 1. Core Rule (Non-Negotiable)
* No AI response may be generated unless **ALL** checks below pass.
* If any check fails, the AI call must not fire.

### 2. Required Stack
* **Platform:** Bubble
* **Payments:** Stripe (subscriptions)
* **AI:** OpenAI API (server-side only)

### 3. Authentication & Access Control
User must:
1.  Be logged in
2.  Have a verified email
3.  Have an **active Stripe subscription**

**Subscription Rules:**
* Stripe is the **source of truth**.
* If subscription is `canceled`, `past_due`, or `unpaid` → access is immediately revoked.
* Stripe webhooks must update Bubble user access status.

### 4. Jurisdiction Enforcement (Critical)
* User selects **one state/jurisdiction** at account setup.
* Jurisdiction is **locked** after selection (cannot change without admin).
* Jurisdiction must be passed with every AI request.
* If user attempts to ask about another state → return a refusal message (no AI call).

### 5. Usage Limits (Abuse Prevention)
* **20 questions/day:** Normal use
* **25 questions/day:** Soft warning message
* **30 questions/day:** Hard stop (no AI call)
* *Requirements:* Track daily usage per user, reset daily, hard stop must block AI request entirely.

### 6. AI Call Rules
* AI calls must be made **server-side only**.
* System prompts must be stored in backend workflows (never exposed in UI).
* User must never see system instructions, prompt logic, or rule explanations.

### 7. Required Data Objects
* **User:** Email, Verified, Subscription status, Jurisdiction (locked), Created date.
* **Subscription:** Stripe customer ID, Plan, Status, Start/End date.
* **Usage Log:** User, Date, Questions used today, Last request timestamp.

### 8. Input Safeguards
* Display warning: *"Do not enter SSNs, medical records, DOBs, or sensitive personal data."*
* Do not store employee PII.
* No long-term storage of user-entered scenarios.

### 9. Admin Controls (Minimum)
Admin must be able to:
* Disable a user
* Reset usage count
* Manually change subscription status
* View basic usage counts

### 10. Explicit Exclusions (Do NOT Build)
* ❌ No prompt visibility
* ❌ No state switching by users
* ❌ No frontend AI calls
* ❌ No bulk processing
* ❌ No data exports of user questions
* ❌ No legal or compliance guarantees in UI

### 11. Acceptance Criteria (Must Demonstrate)
Freelancer must provide:
1.  Confirmation that AI does not respond without active subscription.
2.  Proof that usage limits block AI calls.
3.  Proof that jurisdiction is locked and enforced.
4.  Short walkthrough video showing enforcement working.