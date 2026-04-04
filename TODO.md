# JWT Auth Refresh Token Implementation TODO

## Backend Phase 1: Model & Utils ✅ **DONE**
- [x] Update backend/src/models/user/user.model.js (add refreshToken field)
- [x] Create backend/src/utils/token.js

## Backend Phase 2: Service, Controller, Routes [PENDING]
- [x] Update backend/src/services/auth/auth.service.js (login, refresh, logout **DONE**)
- [x] Update backend/src/controllers/auth.controller.js (login, add refresh-token, logout **DONE**)

- [x] Update backend/src/routes/auth/auth.routes.js (add POST /refresh-token, /logout **DONE**)
 
## Backend Phase 3: Middleware & App **DONE**
 - [x] Update backend/src/middlewares/auth.middleware.js (ACCESS_TOKEN_SECRET)
 - [x] Update backend/src/app.js (add cookieParser)
 - [x] Delete backend/src/middlewares/refreshAuth.middleware.js

## Frontend Phase 4: API & Auth [PENDING]
- [x] Update frontend/src/auth/api.js (withCredentials, remove refreshToken storage, update interceptor **DONE**)
- [ ] Update frontend/src/auth/authApi.js (migrate to axios)
- [x] Check/update frontend/src/auth/AuthProvider.jsx (accessToken only **DONE**)

## Testing & Followup [PENDING]
- [ ] Add .env secrets
- [ ] Restart backend/frontend
- [ ] Test login/refresh/logout flows
- [ ] Update dependents (tenantAuth etc.)

**Next Step: Update user.model.js**

