# TODO: Fix VerifyOTP Destructuring Error (Cannot destructure 'data' of undefined)

## Status: 🛠️ In Progress

**Root Cause:** Stale auth tokens trigger axios interceptor retry logic on public `/verify-otp` endpoint → failed refresh → Promise breaks → `api.post()` returns undefined → destructuring crash.

## Implementation Steps:

### ✅ 1. Created TODO breakdown
### ✅ 2. Fix api.js interceptor - Skip auth retry for public endpoints
### ✅ 3. Add token clearing in authApi.js before OTP calls (`clearTokens()` in verifyOtp/register/resendOtp)
### ☐ 4. Test: Register → Verify OTP → Login (Network tab: no 401/refreshToken calls)
### ☐ 5. Clear Vite cache: `rm -rf frontend/node_modules/.vite`
### ☐ 6. ✅ Complete & verify fix

**Expected Network Flow After Fix:**
```
POST /auth/verify-otp (NO Authorization header) → 200 {message, user}
→ navigate("/login", {message: "Email verified!"})
```

**Current Progress:** Ready to implement Step 2
