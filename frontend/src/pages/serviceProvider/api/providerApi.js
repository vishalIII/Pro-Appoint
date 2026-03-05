const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const parseJsonSafely = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return response.json();
};

const toQueryString = (query = {}) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
};

const authRequest = async ({ token, path, method = "GET", body, query }) => {
  const response = await fetch(
    `${API_BASE_URL}${path}${toQueryString(query)}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );

  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(payload?.message || `Request failed (${response.status})`);
  }

  return payload;
};

export const fetchTenantShops = ({ token }) =>
  authRequest({
    token,
    path: "/tenant/shops",
  });

export const createTenantShop = ({ token, payload }) =>
  authRequest({
    token,
    path: "/tenant/shops",
    method: "POST",
    body: payload,
  });

export const fetchShopIndustries = ({ token }) =>
  authRequest({
    token,
    path: "/tenant/shops/shop-application/industries",
  });

export const fetchDashboardSummary = ({ token, shopId, from, to }) =>
  authRequest({
    token,
    path: "/tenant/dashboard/summary",
    query: { shopId, from, to },
  });

export const fetchTenantAppointments = ({ token, status, from, to }) =>
  authRequest({
    token,
    path: "/tenant/appointments",
    query: { status, from, to },
  });

export const runAppointmentAction = ({
  token,
  appointmentId,
  action,
  body,
}) =>
  authRequest({
    token,
    path: `/tenant/appointments/${appointmentId}/${action}`,
    method: "PATCH",
    body,
  });

export const fetchRevenueAnalytics = ({ token, shopId, range }) =>
  authRequest({
    token,
    path: "/tenant/dashboard/revenue",
    query: { shopId, range },
  });

export const fetchServicePerformance = ({ token, shopId }) =>
  authRequest({
    token,
    path: "/tenant/dashboard/service-performance",
    query: { shopId },
  });

export const fetchResourceUtilization = ({ token, shopId, date }) =>
  authRequest({
    token,
    path: "/tenant/dashboard/resource-utilization",
    query: { shopId, date },
  });

export const fetchShopReviewSummary = ({ token, shopId }) =>
  authRequest({
    token,
    path: `/shops/${shopId}/review-summary`,
  });

export const fetchShopReviews = ({ token, shopId, page = 1, limit = 3 }) =>
  authRequest({
    token,
    path: `/shops/${shopId}/reviews`,
    query: { page, limit },
  });

export const fetchShopById = ({ token, shopId }) =>
  authRequest({
    token,
    path: `/tenant/shops/${shopId}`,
  });

export const updateTenantShop = ({ token, shopId, payload }) =>
  authRequest({
    token,
    path: `/tenant/shops/${shopId}`,
    method: "PATCH",
    body: payload,
  });

export const fetchShopApplicationStatus = ({ token }) =>
  authRequest({
    token,
    path: "/tenant/shops/shop-application/status",
  });

export const fetchSubscription = ({ token }) =>
  authRequest({
    token,
    path: "/tenant/subscription",
  });

export const fetchShopServices = ({ token, shopId }) =>
  authRequest({
    token,
    path: `/tenant/shops/${shopId}/services`,
  });

export const createShopService = ({ token, shopId, payload }) =>
  authRequest({
    token,
    path: `/tenant/shops/${shopId}/services`,
    method: "POST",
    body: payload,
  });

export const updateShopService = ({ token, shopId, serviceId, payload }) =>
  authRequest({
    token,
    path: `/tenant/shops/${shopId}/services/${serviceId}`,
    method: "PATCH",
    body: payload,
  });

export const deleteShopService = ({ token, shopId, serviceId }) =>
  authRequest({
    token,
    path: `/tenant/shops/${shopId}/services/${serviceId}`,
    method: "DELETE",
  });

export const fetchShopResources = ({ token, shopId }) =>
  authRequest({
    token,
    path: `/tenant/shops/${shopId}/resources`,
  });

export const createShopResource = ({ token, shopId, payload }) =>
  authRequest({
    token,
    path: `/tenant/shops/${shopId}/resources`,
    method: "POST",
    body: payload,
  });

export const updateShopResource = ({ token, shopId, resourceId, payload }) =>
  authRequest({
    token,
    path: `/tenant/shops/${shopId}/resources/${resourceId}`,
    method: "PATCH",
    body: payload,
  });

export const deleteShopResource = ({ token, shopId, resourceId }) =>
  authRequest({
    token,
    path: `/tenant/shops/${shopId}/resources/${resourceId}`,
    method: "DELETE",
  });
