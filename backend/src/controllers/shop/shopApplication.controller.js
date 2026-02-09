const Shop = require("../../models/shop/shop.model");
const User = require("../../models/user/user.model");
const Tenant = require("../../models/tenant/tenant.model")
const Industry = require("../../models/service/industry/industry.model");

//get active industries ====================================================================================
exports.getActiveIndustries = async (req, res) => {
  try {
    const industries = await Industry.find({ isActive: true });
    res.json(industries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Post - apply for service provider ===========================================================================
exports.applyShop = async (req, res) => {
  try {
    const PLAN_SHOP_LIMIT = {
      free: 1,
      pro: 2,
      enterprise: 3,
    };

    const userId = req.user.userId;

    // 1. Fetch user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Only service providers
    if (user.role !== "ServiceProvider") {
      return res.status(403).json({
        message: "Only service providers can create shops",
      });
    }

    // 3. Tenant must exist
    const tenant = await Tenant.findOne({ ownerId: userId });
    if (!tenant) {
      return res.status(404).json({
        message: "Tenant not found",
      });
    }

    // ---------------- PLAN CONSTRAINT ----------------

    const tenantPlan = tenant.plan || "free";
    const maxShopsAllowed = PLAN_SHOP_LIMIT[tenantPlan];

    if (!maxShopsAllowed) {
      return res.status(400).json({
        message: "Invalid tenant plan",
      });
    }

    const existingShopCount = await Shop.countDocuments({
      tenantId: tenant._id,
      status: { $in: ["approved"] },
    });

    if (existingShopCount >= maxShopsAllowed) {
      return res.status(403).json({
        message: `Your ${tenantPlan} plan allows only ${maxShopsAllowed} shop(s). Please upgrade your plan.`,
      });
    }

    // -------------------------------------------------

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
    } = req.body;

    // 4. Basic validations
    if (!shopName) {
      return res.status(400).json({ message: "shopName is required" });
    }

    if (!contactEmail || !contactPhone) {
      return res.status(400).json({
        message: "contactEmail and contactPhone are required",
      });
    }

    // Industry check (extra safety, schema already validates)
    const industryExists = await Industry.findOne({
      _id: industry,
      isActive: true,
    });
    if (!industryExists) {
      return res.status(400).json({
        message: "Selected industry is not available",
      });
    }

    // Weekly availability validation
    if (!weeklyAvailability || weeklyAvailability.length !== 7) {
      return res.status(400).json({
        message: "All 7 days availability must be provided",
      });
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
      return res.status(400).json({
        message: "Duplicate or missing days in weekly availability",
      });
    }

    for (let day of providedDays) {
      if (!validDays.includes(day)) {
        return res.status(400).json({
          message: `Invalid day provided: ${day}`,
        });
      }
    }

    // 5. Create shop
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

    return res.status(201).json({
      message: "Shop application submitted successfully",
      shopId: shop._id,
      status: shop.status,
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: "You already have a pending shop application",
      });
    }

    console.error("applyShop error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


// Get service provider application status ===========================================================================
const mongoose = require("mongoose");

exports.getApplicationStatus = async (req, res) => {
  try {
    const userId = req.user.userId;

    // 1. Fetch user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Only service providers
    if (user.role !== "ServiceProvider") {
      return res.status(403).json({
        message: "Only service providers can check application status",
      });
    }

    // 3. Tenant must exist
    const tenant = await Tenant.findOne({
      ownerId: userId,
      // status: "approved",
    });

    if (!tenant) {
      return res.status(404).json({
        message: "Approved tenant not found",
      });
    }

    // 4. Priority-based shop lookup
    let shop =
      (await Shop.findOne({
        tenantId: tenant._id,
        status: "pending",
      }).sort({ createdAt: -1 })) ||

      (await Shop.findOne({
        tenantId: tenant._id,
        status: "approved",
      }).sort({ createdAt: -1 })) ||

      (await Shop.findOne({
        tenantId: tenant._id,
        status: "rejected",
      }).sort({ createdAt: -1 })) ||

      (await Shop.findOne({
        tenantId: tenant._id,
        status: "blocked",
      }).sort({ createdAt: -1 }));

    if (!shop) {
      return res.status(404).json({
        message: "No shop application found",
      });
    }

    return res.status(200).json({
      applicationType: "shop",
      shopId: shop._id,
      status: shop.status,
      reason: shop.statusMeta?.reason || null,
      appliedAt: shop.createdAt,
      updatedAt: shop.updatedAt,
    });

  } catch (error) {
    console.error("getApplicationStatus error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


// Get all applications =============================================================================
exports.getApplicationHistory = async (req, res) => {
  try {
    const userId = req.user.userId;

    // 1. Fetch user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Only service providers
    if (user.role !== "ServiceProvider") {
      return res.status(403).json({
        message: "Only service providers can view application history",
      });
    }

    // 3. Tenant must exist
    const tenant = await Tenant.findOne({ ownerId: userId });
    if (!tenant) {
      return res.status(404).json({
        message: "Tenant not found",
      });
    }

    // 4. Fetch shop application history
    const applications = await Shop.find({ tenantId: tenant._id })
      .sort({ createdAt: -1 })
      .select("name status statusMeta createdAt updatedAt industry");

    return res.status(200).json({
      applicationType: "shop",
      total: applications.length,
      applications,
    });

  } catch (error) {
    console.error("getApplicationHistory error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

