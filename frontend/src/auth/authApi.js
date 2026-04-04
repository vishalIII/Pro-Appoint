import api, { setAccessToken, setRefreshToken, clearTokens } from "./api";

// ===============================
// LOGIN
// ===============================
export const loginRequest = async ({ email, password }) => {
  const { data } = await api.post("/auth/login", { email, password });

  // persist tokens for axios interceptor and fallback refresh
  if (data?.accessToken) setAccessToken(data.accessToken);
  if (data?.refreshToken) setRefreshToken(data.refreshToken);

  return data;
};

// ===============================
// REGISTER
// ===============================
export const registerRequest = async ({ name, email, password, intent }) => {
  const { data } = await api.post("/auth/register", { name, email, password, intent });
  return data;
};

// ===============================
// CREATE SUBSCRIPTION ORDER
// ===============================
export const registerProviderSubscription = async ({ userId, plan }) => {
  const { data } = await api.post("/auth/register-provider-subscription", { userId, plan });
  return data;
};

// ===============================
// VERIFY PAYMENT
// ===============================
export const verifySubscriptionPayment = async ({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  amount
}) => {
  const { data } = await api.post("/payment/verify-subscription", {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    amount
  });
  return data;
};

// ===============================
// LOGOUT
// ===============================
export const logoutRequest = async () => {
  try {
    await api.post("/auth/logout");
  } finally {
    clearTokens();
  }
};
