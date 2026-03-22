# Provider Registration Upgrade Flow - Task Progress

## Status: 12/18 steps complete ✅

### Phase 1: Backend Changes (8 steps)
- [x] 1. Update backend/src/services/auth/auth.service.js: Force role="Customer", add user.intent = req.body.intent || null
- [x] 2. Update backend/src/models/user/user.model.js: Add intent: {type: String, enum: ['provider'], default: null}
- [x] 3. Add to backend/src/routes/auth/auth.routes.js: POST /auth/register-provider-subscription
- [x] 4. Create backend/src/controllers/auth.controller.js: Add registerProviderSubscription handler
- [x] 5. Update backend/src/services/payments/payment.service.js: Add createSubscriptionOrder(plan, amount, userId), verifySubscriptionPayment()
- [x] 6. Extend backend/src/services/payments/payment.service.js: On verify success - create Tenant, update user role/tenantId/isVerified
- [x] 7. Add to backend/src/routes/payment/payment.routes.js: POST /payment/verify-subscription (public verify handler)
- [ ] 8. Add Razorpay webhook endpoint if needed (POST /payment/webhook-subscription)

### Phase 2: Frontend Changes (8 steps)
- [x] 9. Update frontend/src/pages/Register.jsx: Replace dropdown w/ checkbox 'Register as Service Provider', send intent, conditional redirect to /register/plan?userId
- [x] 10. Create frontend/src/pages/PlanSelection.jsx: Plans list (basic:1rs/pro:2rs/enterprise:3rs), button init payment
- [x] 11. Update frontend/src/auth/authApi.js: Add registerProviderSubscription({userId, plan})
- [x] 12. Update frontend/src/routes/routeConfig.jsx / AppRoutes.jsx: Add route for /register/plan-selection
- [ ] 13. In PlanSelection: Load Razorpay SDK, open checkout on order creation success
- [ ] 14. Add frontend/src/pages/paymentCallback.jsx or handle in PlanSelection for success/fail
- [ ] 15. Update ProviderSubscription.jsx if needed for new registrations
- [ ] 16. Add CSS styles for new components

### Phase 3: Testing & Completion (2 steps)
- [ ] 17. Test flows: Customer register, Provider intent->plan->pay success (DB check), pay fail
- [ ] 18. attempt_completion

**Notes**: Plan prices test-only (1/2/3 INR). Secure DB updates only on verified payment. Reuse existing razorpay/payment infra.

- [ ] 2. Update backend/src/models/user/user.model.js: Add intent: {type: String, enum: ['provider'], default: null}
- [ ] 3. Add to backend/src/routes/auth/auth.routes.js: POST /auth/register-provider-subscription
- [ ] 4. Create backend/src/controllers/auth.controller.js: Add registerProviderSubscription handler
- [ ] 5. Update backend/src/services/payments/payment.service.js: Add createSubscriptionOrder(plan, amount, userId), verifySubscriptionPayment()
- [ ] 6. Extend backend/src/services/payments/payment.service.js: On verify success - create Tenant, update user role/tenantId/isVerified
- [ ] 7. Add to backend/src/routes/payment/payment.routes.js: POST /payment/verify-subscription (public verify handler)
- [ ] 8. Add Razorpay webhook endpoint if needed (POST /payment/webhook-subscription)

### Phase 2: Frontend Changes (8 steps)
- [ ] 9. Update frontend/src/pages/Register.jsx: Replace dropdown w/ checkbox 'Register as Service Provider', send intent, conditional redirect to /register/plan?userId
- [ ] 10. Create frontend/src/pages/PlanSelection.jsx: Plans list (basic:1rs/pro:2rs/enterprise:3rs), button init payment
- [ ] 11. Update frontend/src/auth/authApi.js: Add registerProviderSubscription({userId, plan})
- [ ] 12. Update frontend/src/routes/routeConfig.jsx / AppRoutes.jsx: Add route for /register/plan-selection
- [ ] 13. In PlanSelection: Load Razorpay SDK, open checkout on order creation success
- [ ] 14. Add frontend/src/pages/paymentCallback.jsx or handle in PlanSelection for success/fail
- [ ] 15. Update ProviderSubscription.jsx if needed for new registrations
- [ ] 16. Add CSS styles for new components

### Phase 3: Testing & Completion (2 steps)
- [ ] 17. Test flows: Customer register, Provider intent->plan->pay success (DB check), pay fail
- [ ] 18. attempt_completion

**Notes**: Plan prices test-only (1/2/3 INR). Secure DB updates only on verified payment. Reuse existing razorpay/payment infra.

