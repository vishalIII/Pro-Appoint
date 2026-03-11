const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const buildHeaders = (token) => {
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  headers.set("Content-Type", "application/json");
  return headers;
};

const handleResponse = async (response) => {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.message || "Notification request failed";
    throw new Error(message);
  }
  return payload;
};

export const fetchNotifications = async ({ token, page = 1, limit = 20 } = {}) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  const response = await fetch(`${API_BASE_URL}/notifications?${params.toString()}`, {
    method: "GET",
    headers: buildHeaders(token),
  });
  return handleResponse(response);
};

export const markNotificationRead = async ({ token, notificationId }) => {
  const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
    method: "PATCH",
    headers: buildHeaders(token),
  });
  return handleResponse(response);
};

export const markAllNotificationsRead = async ({ token }) => {
  const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
    method: "PATCH",
    headers: buildHeaders(token),
  });
  return handleResponse(response);
};
