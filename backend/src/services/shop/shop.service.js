const mongoose = require("mongoose");
const Shop = require("../../models/shop/shop.model");
const Tenant = require("../../models/tenant/tenant.model");
const User = require("../../models/user/user.model");
const Industry = require("../../models/service/industry/industry.model");
const AppError = require("../../utils/appError");
const { getPlanLimits } = require("../../config/planLimits");
const {
  validateShopWeeklyAvailability,
} = require("../../utils/availability");
const {
  deactivateServicesForShop,
} = require("../service/service.service");

const getOwnedShop = async ({ shopId, tenantId }) => {
  if (!shopId) {
    throw new AppError("Shop ID is required", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(shopId)) {
    throw new AppError("Invalid Shop ID", 400);
  }

  const shop = await Shop.findOne({
    _id: shopId,
    tenantId,
  });

  if (!shop) {
    throw new AppError("Unauthorized access to this shop", 403);
  }

  return shop;
};

const ensureTenantCanCreateShop = async ({ tenant, tenantId }) => {
  if (!tenant?.isActive) {
    throw new AppError("Tenant inactive", 403);
  }

  const planLimits = getPlanLimits(tenant.plan);
  const approvedShopCount = await Shop.countDocuments({
    tenantId,
    status: "approved",
  });

  if (
    typeof planLimits.maxShops === "number" &&
    approvedShopCount >= planLimits.maxShops
  ) {
    throw new AppError(
      `Your current plan allows a maximum of ${planLimits.maxShops} shop(s).`,
      403,
    );
  }
};

const resolveNextShopStatus = ({ currentStatus, requestedStatus }) => {
  if (requestedStatus === undefined) return null;

  const normalizedRequestedStatus =
    typeof requestedStatus === "string" ? requestedStatus.trim().toLowerCase() : "";

  if (!normalizedRequestedStatus) {
    throw new AppError("status cannot be empty", 400);
  }

  if (!["approved", "blocked"].includes(normalizedRequestedStatus)) {
    throw new AppError("Only activate/deactivate status updates are allowed", 400);
  }

  if (["pending", "rejected"].includes(currentStatus)) {
    throw new AppError(`Shop with status '${currentStatus}' cannot be activated/deactivated`, 400);
  }

  if (currentStatus === normalizedRequestedStatus) {
    return normalizedRequestedStatus;
  }

  if (currentStatus === "approved" && normalizedRequestedStatus === "blocked") {
    return "blocked";
  }

  if (currentStatus === "blocked" && normalizedRequestedStatus === "approved") {
    return "approved";
  }

  throw new AppError("Invalid status transition for shop", 400);
};

/* --------------------------------------------------
   GET MY SHOPS
-------------------------------------------------- */
exports.getMyShops = async ({ tenantId }) => {
  try {
    if (!tenantId) {
      throw new AppError("Tenant ID is required", 400);
    }

    return await Shop.find({ tenantId }).sort({ createdAt: -1 });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to fetch shops", 500);
  }
};

/* --------------------------------------------------
   CREATE SHOP
-------------------------------------------------- */
exports.createShop = async ({ tenantId, userId, payload }) => {
  try {
    if (!tenantId) {
      throw new AppError("Tenant ID is required", 400);
    }
    if (!userId) {
      throw new AppError("User ID is required", 400);
    }

    const [tenant, user] = await Promise.all([
      Tenant.findById(tenantId).select("_id plan isActive"),
      User.findById(userId).select("_id"),
    ]);

    if (!tenant) {
      throw new AppError("Tenant not found", 404);
    }
    if (!user) {
      throw new AppError("User not found", 404);
    }

    await ensureTenantCanCreateShop({ tenant, tenantId });

    const shopName =
      typeof payload?.shopName === "string" ? payload.shopName.trim() : "";

    if (!shopName) {
      throw new AppError("Shop name is required", 400);
    }

    if (!payload?.industry || !mongoose.Types.ObjectId.isValid(payload.industry)) {
      throw new AppError("Valid industry is required", 400);
    }

    const activeIndustry = await Industry.findOne({
      _id: payload.industry,
      isActive: true,
    }).select("_id");

    if (!activeIndustry) {
      throw new AppError("Selected industry is not active", 400);
    }

    if (
      typeof payload?.contactEmail !== "string" ||
      !payload.contactEmail.trim()
    ) {
      throw new AppError("contactEmail is required", 400);
    }

    if (
      typeof payload?.contactPhone !== "string" ||
      !payload.contactPhone.trim()
    ) {
      throw new AppError("contactPhone is required", 400);
    }

    if (!Array.isArray(payload?.weeklyAvailability)) {
      throw new AppError("weeklyAvailability is required", 400);
    }

    const weeklyAvailability = validateShopWeeklyAvailability(payload.weeklyAvailability);

    const address =
      payload?.address && typeof payload.address === "object"
        ? {
            street: payload.address.street,
            city: payload.address.city,
            state: payload.address.state,
            pincode: payload.address.pincode,
            landMark: payload.address.landMark,
          }
        : {};

    const shop = await Shop.create({
      shopName,
      tenantId,
      ownerId: userId,
      industry: activeIndustry._id,
      weeklyAvailability,
      description: payload?.description,
      address,
      contactEmail: payload.contactEmail.trim(),
      contactPhone: payload.contactPhone.trim(),
      images: Array.isArray(payload?.images) ? payload.images : [],
      status: "approved",
    });

    return shop;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to create shop", 500);
  }
};

/* --------------------------------------------------
   GET SHOP BY ID
-------------------------------------------------- */
exports.getShopById = async ({ shopId, tenantId }) => {
  try {
    return await getOwnedShop({ shopId, tenantId });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to fetch shop", 500);
  }
};

/* --------------------------------------------------
   UPDATE SHOP
-------------------------------------------------- */
exports.updateShop = async ({ shopId, tenantId, userId, updatePayload }) => {
  try {
    const existingShop = await getOwnedShop({ shopId, tenantId });

    const allowedUpdates = [
      "shopName",
      "description",
      "images",
      "contactEmail",
      "contactPhone",
      "address",
      "weeklyAvailability",
    ];

    const setUpdates = {};
    const unsetUpdates = {};

    allowedUpdates.forEach((field) => {
      if (updatePayload?.[field] !== undefined) {
        setUpdates[field] = updatePayload[field];
      }
    });

    if (updatePayload?.shopName !== undefined) {
      const normalizedShopName =
        typeof updatePayload.shopName === "string"
          ? updatePayload.shopName.trim()
          : "";

      if (!normalizedShopName) {
        throw new AppError("Shop name cannot be empty", 400);
      }
      setUpdates.shopName = normalizedShopName;
    }

    if (updatePayload?.weeklyAvailability !== undefined) {
      setUpdates.weeklyAvailability = validateShopWeeklyAvailability(
        updatePayload.weeklyAvailability,
      );
    }

    const nextStatus = resolveNextShopStatus({
      currentStatus: existingShop.status,
      requestedStatus: updatePayload?.status,
    });

    if (nextStatus) {
      setUpdates.status = nextStatus;

      if (nextStatus === "blocked") {
        setUpdates.statusMeta = {
          reason:
            typeof updatePayload?.statusReason === "string" &&
            updatePayload.statusReason.trim()
              ? updatePayload.statusReason.trim()
              : "Deactivated by owner",
          by: userId,
          at: new Date(),
        };
      } else if (nextStatus === "approved") {
        unsetUpdates.statusMeta = "";
      }
    }

    if (Object.keys(setUpdates).length === 0 && Object.keys(unsetUpdates).length === 0) {
      return existingShop;
    }

    const updateCommand = {};
    if (Object.keys(setUpdates).length > 0) {
      updateCommand.$set = setUpdates;
    }
    if (Object.keys(unsetUpdates).length > 0) {
      updateCommand.$unset = unsetUpdates;
    }

    const shop = await Shop.findByIdAndUpdate(
      shopId,
      updateCommand,
      { new: true, runValidators: true },
    );

    if (!shop) {
      throw new AppError("Shop not found", 404);
    }

    if (nextStatus === "blocked") {
      await deactivateServicesForShop({ shopId: shop._id });
    }

    return shop;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to update shop", 500);
  }
};

/* --------------------------------------------------
   DELETE SHOP (SOFT DELETE)
-------------------------------------------------- */
exports.deleteShop = async ({ shopId, tenantId, userId }) => {
  try {
    const shop = await getOwnedShop({ shopId, tenantId });

    if (shop.status === "blocked") {
      throw new AppError("Shop is already deleted", 400);
    }

    await Shop.findByIdAndUpdate(
      shopId,
      {
        $set: {
          status: "blocked",
          statusMeta: {
            reason: "Deleted by owner",
            by: userId,
            at: new Date(),
          },
        },
      },
      { runValidators: true },
    );

    await deactivateServicesForShop({ shopId });

    return true;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to delete shop", 500);
  }
};
