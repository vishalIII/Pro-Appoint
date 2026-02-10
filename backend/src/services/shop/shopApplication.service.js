const Shop = require("../../models/shop/shop.model");
const User = require("../../models/user/user.model");
const Tenant = require("../../models/tenant/tenant.model");
const Industry = require("../../models/service/industry/industry.model");

const PLAN_SHOP_LIMIT = {
  free: 1,
  pro: 2,
  enterprise: 3,
};

// =======================================================
// Apply for shop
// =======================================================
exports.applyShop = async (userId, data) => {
  // 1. User
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // 2. Role check
  if (user.role !== "ServiceProvider") {
    throw new Error("Only service providers can apply for a shop");
  }

  // 3. Tenant
  const tenant = await Tenant.findOne({ ownerId: userId });
  if (!tenant) {
    throw new Error("Tenant not found");
  }

  // 4. Plan constraint
  const tenantPlan = tenant.plan || "free";
  const maxShopsAllowed = PLAN_SHOP_LIMIT[tenantPlan];

  if (!maxShopsAllowed) {
    throw new Error("Invalid tenant plan");
  }

  const approvedShopCount = await Shop.countDocuments({
    tenantId: tenant._id,
    status: "approved",
  });

  if (approvedShopCount >= maxShopsAllowed) {
    throw new Error(
      `Your ${tenantPlan} plan allows only ${maxShopsAllowed} shop(s)`
    );
  }

  const {
    shopName,
    industry,
    weeklyAvailability,
    contactEmail,
    contactPhone,
    description,
    address,
    images,
    documents,
  } = data;

  // 5. Validations
  if (!shopName) throw new Error("shopName is required");
  if (!contactEmail || !contactPhone) {
    throw new Error("contactEmail and contactPhone are required");
  }

  const industryExists = await Industry.findOne({
    _id: industry,
    isActive: true,
  });
  if (!industryExists) {
    throw new Error("Selected industry is not available");
  }

  if (!weeklyAvailability || weeklyAvailability.length !== 7) {
    throw new Error("All 7 days availability must be provided");
  }

  const validDays = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  const providedDays = weeklyAvailability.map(d => d.day);
  if (new Set(providedDays).size !== 7) {
    throw new Error("Duplicate or missing days in weekly availability");
  }

  for (let day of providedDays) {
    if (!validDays.includes(day)) {
      throw new Error(`Invalid day provided: ${day}`);
    }
  }

  // 6. Create shop
  const shop = await Shop.create({
    shopName,
    tenantId: tenant._id,
    ownerId: userId,
    industry,
    weeklyAvailability,
    contactEmail,
    contactPhone,
    description,
    address,
    images,
    documents,
    status: "pending",
  });

  return shop;
};

// =======================================================
// Get latest shop application status
// =======================================================
exports.getShopApplicationStatus = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  if (user.role !== "ServiceProvider") {
    throw new Error("Only service providers can check application status");
  }

  const tenant = await Tenant.findOne({ ownerId: userId });
  if (!tenant) throw new Error("Tenant not found");

  const shop =
    (await Shop.findOne({ tenantId: tenant._id, status: "pending" }).sort({ createdAt: -1 })) ||
    (await Shop.findOne({ tenantId: tenant._id, status: "approved" }).sort({ createdAt: -1 })) ||
    (await Shop.findOne({ tenantId: tenant._id, status: "rejected" }).sort({ createdAt: -1 })) ||
    (await Shop.findOne({ tenantId: tenant._id, status: "blocked" }).sort({ createdAt: -1 }));

  if (!shop) {
    throw new Error("No shop application found");
  }

  return {
    applicationType: "shop",
    shopId: shop._id,
    status: shop.status,
    reason: shop.statusMeta?.reason || null,
    appliedAt: shop.createdAt,
    updatedAt: shop.updatedAt,
  };
};

// =======================================================
// Get shop application history
// =======================================================
exports.getShopApplicationHistory = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  if (user.role !== "ServiceProvider") {
    throw new Error("Only service providers can view application history");
  }

  const tenant = await Tenant.findOne({ ownerId: userId });
  if (!tenant) throw new Error("Tenant not found");

  const applications = await Shop.find({ tenantId: tenant._id })
    .sort({ createdAt: -1 });

  return {
    applicationType: "shop",
    total: applications.length,
    applications,
  };
};
