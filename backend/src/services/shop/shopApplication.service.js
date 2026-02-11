const Shop = require("../../models/shop/shop.model");
const User = require("../../models/user/user.model");
const Tenant = require("../../models/tenant/tenant.model");
const Industry = require("../../models/service/industry/industry.model");
const AppError = require("../../utils/appError");

const PLAN_SHOP_LIMIT = {
  free: 1,
  pro: 2,
  enterprise: 3,
};

// =======================================================
// Get Active Industries
// =======================================================
exports.getActiveIndustries = async () => {
  return await Industry.find({ isActive: true });
};

// =======================================================
// Apply for Shop
// =======================================================
exports.applyShop = async (userId, data) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.role !== "ServiceProvider") {
    throw new AppError("Only service providers can apply for a shop", 403);
  }

  const tenant = await Tenant.findOne({ ownerId: userId });
  if (!tenant) {
    throw new AppError("Tenant not found", 404);
  }

  const tenantPlan = tenant.plan || "free";
  const maxShopsAllowed = PLAN_SHOP_LIMIT[tenantPlan];

  if (!maxShopsAllowed) {
    throw new AppError("Invalid tenant plan", 400);
  }

  const approvedShopCount = await Shop.countDocuments({
    tenantId: tenant._id,
    status: "approved",
  });

  if (approvedShopCount >= maxShopsAllowed) {
    throw new AppError(
      `Your ${tenantPlan} plan allows only ${maxShopsAllowed} shop(s)`,
      403
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

  if (!shopName) {
    throw new AppError("shopName is required", 400);
  }

  if (!contactEmail || !contactPhone) {
    throw new AppError("contactEmail and contactPhone are required", 400);
  }
  

  const industryExists = await Industry.findOne({
    _id: industry,
    isActive: true,
  });

  if (!industryExists) {
    throw new AppError("Selected industry is not available", 400);
  }

  if (!weeklyAvailability || weeklyAvailability.length !== 7) {
    throw new AppError("All 7 days availability must be provided", 400);
  }

  const validDays = [
    "monday","tuesday","wednesday","thursday",
    "friday","saturday","sunday",
  ];

  const providedDays = weeklyAvailability.map(d => d.day);

  if (new Set(providedDays).size !== 7) {
    throw new AppError("Duplicate or missing days in weekly availability", 400);
  }

  for (let day of providedDays) {
    if (!validDays.includes(day)) {
      throw new AppError(`Invalid day provided: ${day}`, 400);
    }
  }

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
// Get Shop Application Status
// =======================================================
exports.getShopApplicationStatus = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  if (user.role !== "ServiceProvider") {
    throw new AppError(
      "Only service providers can check application status",
      403
    );
  }

  const tenant = await Tenant.findOne({ ownerId: userId });
  if (!tenant) throw new AppError("Tenant not found", 404);

  const shop = await Shop.findOne({ tenantId: tenant._id })
    .sort({ createdAt: -1 });

  if (!shop) {
    throw new AppError("No shop application found", 404);
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
// Get Shop Application History
// =======================================================
exports.getShopApplicationHistory = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  if (user.role !== "ServiceProvider") {
    throw new AppError(
      "Only service providers can view application history",
      403
    );
  }

  const tenant = await Tenant.findOne({ ownerId: userId });
  if (!tenant) throw new AppError("Tenant not found", 404);

  const applications = await Shop.find({ tenantId: tenant._id })
    .sort({ createdAt: -1 });

  return {
    applicationType: "shop",
    total: applications.length,
    applications,
  };
};
