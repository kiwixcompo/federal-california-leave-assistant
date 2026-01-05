# Bubble & Stripe Data Model & Enforcement Logic

## A) Bubble Data Model

### 1) Data Type: User
* `email_verified` (yes/no)
* `role` (text; values: user, admin)
* `jurisdiction` (text; values like CA, FED)
* `jurisdiction_locked` (yes/no) - default no
* `access_status` (text; values: active, past_due, canceled, disabled)
* `stripe_customer_id` (text)
* `stripe_subscription_id` (text)
* `plan_id` (text)
* `current_period_end` (date)
* `daily_question_limit` (number) - default 20
* `soft_throttle_threshold` (number) - default 25
* `hard_stop_threshold` (number) - default 30

### 2) Data Type: UsageDay
* `user` (User)
* `date_key` (date) - store at midnight local or "today" date
* `questions_used` (number) - default 0
* `last_request_at` (date)
* `throttle_level` (text; values: none, soft, hard)

### 3) Data Type: Subscription EventLog (Optional)
* `stripe_event_id` (text)
* `event_type` (text)
* `customer_id` (text)
* `processed_ok` (yes/no)

---

## B) Stripe Setup + Enforcement Logic

### 1) Stripe Products
* **HRLA California:** Monthly ($29) / Annual ($290)
* **HRLA Federal:** Monthly ($29) / Annual ($290)
* *Note: Keep a clean mapping between Stripe price_id → plan_id.*

### 2) Webhooks (Must Handle)
* `checkout.session.completed` → Set stripe IDs, status=pending/active
* `customer.subscription.created` / `updated` → Set `access_status = active`
* `invoice.payment_failed` → Set `access_status = past_due`
* `customer.subscription.deleted` → Set `access_status = canceled`

### 3) Enforcement Logic (The "Gate")
**Run these checks in order before ANY AI call:**
1.  **Authenticated?** (Logged in)
2.  **Access active?** (`access_status` is active)
3.  **Jurisdiction set?** (`jurisdiction` not empty + locked)
4.  **Hard stop check:** (`questions_used` < `hard_stop_threshold`)
5.  **Input check:** (No cross-jurisdiction keywords, no PII)

### 4) Messages to User
* **Inactive:** “Your subscription is not active. Please update billing to continue.”
* **Soft throttle:** “You’re nearing today’s limit. Try again tomorrow or upgrade for higher limits.”
* **Hard stop:** “You’ve reached today’s limit. Access resets tomorrow.”

### 5) Acceptance Tests
* Verify no AI call without subscription.
* Verify cancelation in Stripe revokes access immediately via webhook.
* Verify hard stop at 30 questions.
* Verify jurisdiction is locked.