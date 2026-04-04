import api from "../../../auth/api";

// const toQueryString = (query = {}) => {
//   const params = new URLSearchParams();
//   Object.entries(query).forEach(([key, value]) => {
//     if (value === undefined || value === null || value === "") return;
//     params.set(key, String(value));
//   });
//   const encoded = params.toString();
//   return encoded ? `?${encoded}` : "";
// };

const authRequest = async ({ path, method = "GET", body, query }) => {
  const { data } = await api.request({
    url: path,
    method,
    params: query,
    data: body,
  });
  return data;
};

export const fetchTenantShops = () =>
  authRequest({
    path: "/tenant/shops",
  });

export const createTenantShop = ({ payload }) =>
  authRequest({
    path: "/tenant/shops",
    method: "POST",
    body: payload,
  });

export const fetchShopIndustries = () =>
  authRequest({
    path: "/tenant/shops/shop-application/industries",
  });

export const fetchDashboardSummary = ({ shopId, from, to }) =>
  authRequest({
    path: "/tenant/dashboard/summary",
    query: { shopId, from, to },
  });

export const fetchTenantAppointments = ({ status, from, to, page, limit, shopId }) =>
  authRequest({
    path: "/tenant/appointments",
    query: { status, from, to, page, limit, shopId },
  });

export const runAppointmentAction = ({
  appointmentId,
  action,
  body,
}) =>
  authRequest({
    path: `/tenant/appointments/${appointmentId}/${action}`,
    method: "PATCH",
    body,
  });

export const fetchJoinCredentials = ({ appointmentId }) =>
  authRequest({
    path: `/video/join/${appointmentId}`,
  });

export const endMeeting = ({ appointmentId }) =>
  authRequest({
    path: `/video/end/${appointmentId}`,
    method: "POST",
  });

export const fetchRevenueAnalytics = ({ shopId, range }) =>
  authRequest({
    path: "/tenant/dashboard/revenue",
    query: { shopId, range },
  });

export const fetchServicePerformance = ({ shopId }) =>
  authRequest({
    path: "/tenant/dashboard/service-performance",
    query: { shopId },
  });

export const fetchResourceUtilization = ({ shopId, date }) =>
  authRequest({
    path: "/tenant/dashboard/resource-utilization",
    query: { shopId, date },
  });

export const fetchShopReviewSummary = ({ shopId }) =>
  authRequest({
    path: `/shops/${shopId}/review-summary`,
  });

export const fetchShopReviews = ({ shopId, page = 1, limit = 3 }) =>
  authRequest({
    path: `/shops/${shopId}/reviews`,
    query: { page, limit },
  });

export const fetchShopById = ({ shopId }) =>
  authRequest({
    path: `/tenant/shops/${shopId}`,
  });

export const updateTenantShop = ({ shopId, payload }) =>
  authRequest({
    path: `/tenant/shops/${shopId}`,
    method: "PATCH",
    body: payload,
  });

export const fetchShopApplicationStatus = () =>
  authRequest({
    path: "/tenant/shops/shop-application/status",
  });

export const fetchSubscription = () =>
  authRequest({
    path: "/tenant/subscription",
  });

export const fetchShopServices = ({ shopId }) =>
  authRequest({
    path: `/tenant/shops/${shopId}/services`,
  });

export const createShopService = ({ shopId, payload }) =>
  authRequest({
    path: `/tenant/shops/${shopId}/services`,
    method: "POST",
    body: payload,
  });

export const updateShopService = ({ shopId, serviceId, payload }) =>
  authRequest({
    path: `/tenant/shops/${shopId}/services/${serviceId}`,
    method: "PATCH",
    body: payload,
  });

export const deleteShopService = ({ shopId, serviceId }) =>
  authRequest({
    path: `/tenant/shops/${shopId}/services/${serviceId}`,
    method: "DELETE",
  });

export const fetchShopResources = ({ shopId }) =>
  authRequest({
    path: `/tenant/shops/${shopId}/resources`,
  });

export const createShopResource = ({ shopId, payload }) =>
  authRequest({
    path: `/tenant/shops/${shopId}/resources`,
    method: "POST",
    body: payload,
  });

export const updateShopResource = ({ shopId, resourceId, payload }) =>
  authRequest({
    path: `/tenant/shops/${shopId}/resources/${resourceId}`,
    method: "PATCH",
    body: payload,
  });

export const deleteShopResource = ({ shopId, resourceId }) =>
  authRequest({
    path: `/tenant/shops/${shopId}/resources/${resourceId}`,
    method: "DELETE",
  });

export const getUploadSignature = ({ folder, fileType, fileSize }) =>
  authRequest({
    path: "/uploads/signature",
    method: "POST",
    body: { folder, fileType, fileSize },
  });
