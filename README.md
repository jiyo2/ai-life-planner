# AI Life Planner — V2

V2 upgrades the first prototype into a cleaner product flow:

**Landing page → trip intake → review → $4.99 one-time checkout → personalized plan**

### What is real in this V2
- Responsive product UI
- Trip intake and validation
- Budget/preferences capture
- Review screen
- One-time $4.99 product positioning
- Personalized plan generation from the submitted inputs

### What still needs production connections
1. Payment processor checkout (e.g. Stripe, subject to account/country availability)
2. Secure backend
3. Real AI API
4. Live hotel/activity/transport data
5. Affiliate links and tracking
6. User email/account and saved plans
7. Production hosting + domain

**Important:** The current checkout is a simulation. Do not use it to collect real card details.

### Recommended production flow
Create the plan request -> create payment session on backend -> payment webhook confirms payment -> backend calls AI and travel APIs -> return plan to paid user.

Never put private API keys in `index.html` or `app.js`.
