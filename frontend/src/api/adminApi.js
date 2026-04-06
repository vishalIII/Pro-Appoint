import api from "../auth/api";

// ---------------- Shop Applications ----------------
export const fetchShopApplications = async ({ pendingOnly = true } = {}) => {
  const endpoint = pendingOnly
    ? "/admin/shop-application/pending"
    : "/admin/shop-application";
  const { data } = await api.get(endpoint);
  return Array.isArray(data) ? data : [];
};

export const approveShopApplication = async (shopId) => {
  if (!shopId) throw new Error("shopId is required");
  const { data } = await api.patch(`/admin/shop-application/${shopId}/approve`);
  return data;
};

export const rejectShopApplication = async ({ shopId, reason }) => {
  if (!shopId) throw new Error("shopId is required");
  const { data } = await api.patch(`/admin/shop-application/${shopId}/reject`, {
    reason,
  });
  return data;
};

export const suspendShop = async ({ shopId, reason }) => {
  if (!shopId) throw new Error("shopId is required");
  const { data } = await api.patch(`/admin/shop-application/${shopId}/suspend`, {
    reason,
  });
  return data;
};

// ---------------- Industries ----------------
export const fetchIndustries = async () => {
  const { data } = await api.get("/admin/industry");
  return Array.isArray(data?.industries) ? data.industries : [];
};

export const createIndustry = async (name) => {
  const { data } = await api.post("/admin/industry", { name });
  return data?.industry;
};

export const updateIndustry = async (id, payload) => {
  const { data } = await api.patch(`/admin/industry/${id}`, payload);
  return data?.industry;
};

export const toggleIndustryStatus = async (id) => {
  const { data } = await api.patch(`/admin/industry/toggle-status/${id}`);
  return data?.industry;
};

export const deleteIndustry = async (id) => {
  await api.delete(`/admin/industry/${id}`);
  return true;
};

// ---------------- Tenant Applications ----------------
export const fetchTenantApplications = async () => {
  const { data } = await api.get("/admin/tenant-application");
  return Array.isArray(data) ? data : [];
};
