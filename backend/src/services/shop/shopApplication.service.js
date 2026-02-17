const Shop = require("../../models/shop/shop.model");
const User = require("../../models/user/user.model");
const Tenant = require("../../models/tenant/tenant.model");
const Industry = require("../../models/service/industry/industry.model");
const AppError = require("../../utils/appError");
const mongoose = require("mongoose");

const PLAN_SHOP_LIMIT = {
  basic: 1,
  pro: 2,
  enterprise: 3,
};

// get active industries ====================================================================================
exports.getActiveIndustries = async () => {
  try {
    return await Industry.find({ isActive: true });
  } catch (error) {
    throw new AppError(
      error.message || "Failed to fetch industries",
      error.statusCode || 500,
    );
  }
};

// =======================================================
// Apply for shop
// =======================================================
exports.applyShop = async (userId, data) => {
  try {
    // 1. User
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // 2. Role check
    if (user.role !== "ServiceProvider") {
      throw new AppError("Only service providers can apply for shops", 403);
    }

    // 3. Tenant
    const tenant = await Tenant.findOne({ ownerId: userId });
    if (!tenant) {
      throw new AppError("Tenant not found for user", 404);
    }

    // 4. Plan constraint
    const tenantPlan = tenant.plan || "free";
    const maxShopsAllowed = PLAN_SHOP_LIMIT[tenantPlan];

    if (!maxShopsAllowed) {
      throw new AppError(
        "Invalid tenant plan. Cannot determine shop limit.",
        400,
      );
    }

    const approvedShopCount = await Shop.countDocuments({
      tenantId: tenant._id,
      status: "approved",
    });

    if (approvedShopCount >= maxShopsAllowed) {
      throw new AppError(
        `Your current plan (${tenantPlan}) allows a maximum of ${maxShopsAllowed} approved shop(s). Please contact support to upgrade your plan.`,
        403,
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
    if (!shopName) throw new AppError("Shop Name is required", 400);
    if (!contactEmail || !contactPhone) {
      throw new AppError("Contact Email and Contact Phone are required", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(industry)) {
      throw new AppError("Selected industry is not available", 400);
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
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];

    const providedDays = weeklyAvailability.map((d) => d.day);
    if (new Set(providedDays).size !== 7) {
      throw new AppError(
        "Duplicate or missing days in weekly availability",
        400,
      );
    }

    for (let day of providedDays) {
      if (!validDays.includes(day)) {
        throw new AppError(`Invalid day provided: ${day}`, 400);
      }
    }

    const existingShop = await Shop.findOne({ ownerId: userId });

    if (existingShop) {
      throw new AppError("You already have a pending shop which is not reviewed yet", 400);
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
  } catch (error) {
    // If already an AppError, rethrow it
    if (error instanceof AppError) {
      throw error;
    }
    // Otherwise throw generic
    throw new AppError(error.message || "Failed to apply for shop", 500);
  }
};

// =======================================================
// Get latest shop application status
// =======================================================
exports.getShopApplicationStatus = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    if (user.role !== "ServiceProvider") {
      throw new AppError(
        "Only service providers can check application status",
        403,
      );
    }

    const tenant = await Tenant.findOne({ ownerId: userId });
    if (!tenant) throw new AppError("Tenant not found", 404);

    const shop =
      (await Shop.findOne({ tenantId: tenant._id, status: "pending" }).sort({
        createdAt: -1,
      })) ||
      (await Shop.findOne({ tenantId: tenant._id, status: "approved" }).sort({
        createdAt: -1,
      })) ||
      (await Shop.findOne({ tenantId: tenant._id, status: "rejected" }).sort({
        createdAt: -1,
      })) ||
      (await Shop.findOne({ tenantId: tenant._id, status: "blocked" }).sort({
        createdAt: -1,
      }));

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
  } catch (error) {
    throw new AppError(
      error.message || "Failed to fetch shop application status",
      error.statusCode || 500,
    );
  }
};

// =======================================================
// Get shop application history
// =======================================================
exports.getShopApplicationHistory = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    if (user.role !== "ServiceProvider") {
      throw new AppError(
        "Only service providers can view application history",
        403,
      );
    }

    const tenant = await Tenant.findOne({ ownerId: userId });
    if (!tenant) throw new AppError("Tenant not found", 404);

    const applications = await Shop.find({ tenantId: tenant._id }).sort({
      createdAt: -1,
    });

    return {
      applicationType: "shop",
      total: applications.length,
      applications,
    };
  } catch (error) {
    throw new AppError(
      error.message || "Failed to fetch shop application history",
      error.statusCode || 500,
    );
  }
};
