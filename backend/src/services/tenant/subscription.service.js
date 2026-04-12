const mongoose = require("mongoose");
const Tenant = require("../../models/tenant/tenant.model");
const Shop = require("../../models/shop/shop.model");
const Service = require("../../models/service/service.model");
const Resource = require("../../models/resource/resource.model");
const AppError = require("../../utils/appError");
const { getPlanLimits } = require("../../config/planLimits");

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const getDaysUntil = (dateValue) => {
  if (!dateValue) return null;
  const now = new Date();
  const endDate = new Date(dateValue);
  const differenceMs = endDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(differenceMs / (1000 * 60 * 60 * 24)));
};

exports.getTenantSubscription = async ({ tenantId }) => {
  try {
    if (!tenantId || !isValidObjectId(tenantId)) {
      throw new AppError("Invalid tenant ID", 400);
    }

    const tenant = await Tenant.findById(tenantId).select(
      "_id ownerId plan planStatus subscriptionStart subscriptionEnd isActive",
    );

    if (!tenant) {
      throw new AppError("Tenant not found", 404);
    }

    const planLimits = getPlanLimits(tenant.plan);

    const shops = await Shop.find({ tenantId: tenant._id }).select("_id status");
    const shopIds = shops.map((shop) => shop._id);

    const [activeServiceCount, activeResourceCount] = await Promise.all([
      shopIds.length > 0
        ? Service.countDocuments({
            shopId: { $in: shopIds },
            isActive: true,
          })
        : 0,
      Resource.countDocuments({
        tenantId: tenant._id,
        isActive: true,
      }),
    ]);

    const approvedShopCount = shops.filter((shop) => shop.status === "approved").length;
    const pendingShopCount = shops.filter((shop) => shop.status === "pending").length;
    const daysUntilExpiry = getDaysUntil(tenant.subscriptionEnd);
    const shopLimit = planLimits.maxShops;
    const shopsUsagePct =
      typeof shopLimit === "number" && shopLimit > 0
        ? Math.min(100, Math.round((approvedShopCount / shopLimit) * 100))
        : null;

    return {
      tenantId: tenant._id,
      plan: tenant.plan,
      planStatus: tenant.planStatus,
      isActive: tenant.isActive,
      subscriptionStart: tenant.subscriptionStart,
      subscriptionEnd: tenant.subscriptionEnd,
      daysUntilExpiry,
      limits: {
        maxShops: planLimits.maxShops,
        maxServicesPerShop: planLimits.maxServicesPerShop,
        maxResourcesPerShop: planLimits.maxResourcesPerShop,
      },
      usage: {
        approvedShops: approvedShopCount,
        pendingShops: pendingShopCount,
        totalShops: shops.length,
        activeServices: activeServiceCount,
        activeResources: activeResourceCount,
      },
      usageProgress: {
        shopsPct: shopsUsagePct,
      },
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to fetch subscription details", 500);
  }
};
