const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const parseJsonSafely = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return response.json();
};

const getErrorMessage = (payload, fallback) => {
  if (payload?.message && typeof payload.message === "string") return payload.message;
  return fallback;
};

export const loginRequest = async ({ email, password }) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Login failed"));
  }

  return payload;
};

export const registerRequest = async ({ name, email, password, intent }) => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, intent })
  });

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Registration failed"));
  }

  return payload;
};

export const registerProviderSubscription = async ({ userId, plan }) => {
  const response = await fetch(`${API_BASE_URL}/auth/register-provider-subscription`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, plan })
  });

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Subscription order creation failed"));
  }

  return payload;
};

export const verifySubscriptionPayment = async ({ razorpay_order_id, razorpay_payment_id, razorpay_signature, amount }) => {
  const response = await fetch(`${API_BASE_URL}/payment/verify-subscription`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ razorpay_order_id, razorpay_payment_id, razorpay_signature, amount })
  });

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Payment verification failed"));
  }

  return payload;
};

