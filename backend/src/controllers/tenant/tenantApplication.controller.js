const Tenant = require("../../models/tenant/tenant.model");
const User = require("../../models/user/user.model");
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
exports.applyProvider = async (req, res) => {
  try {
    const PLAN_TENANT_LIMIT = {
      free: 1,
      pro: 2,
      enterprise: 3,
    };

    const userId = req.user.userId;
    //fetching user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    //-------------------------------------------------------CONSTRAINT
    //it will make sure approved tenats limit is according to plan

    // 1. Get user's plan
    const userPlan = user.plan || "free";

    // 2. Get allowed tenant limit for this plan
    const maxTenantsAllowed = PLAN_TENANT_LIMIT[userPlan];

    if (!maxTenantsAllowed) {
      return res.status(400).json({
        message: "Invalid user plan",
      });
    }

    // 3. Count existing tenants (pending + approved)
    const existingTenantCount = await Tenant.countDocuments({
      ownerId: userId,
      status: { $in: ["approved"] },
    });

    // 4. Check limit
    if (existingTenantCount >= maxTenantsAllowed) {
      return res.status(403).json({
        message: `Your ${userPlan} plan allows only ${maxTenantsAllowed} tenant(s). Please upgrade your plan.`,
      });
    }
    //------------------------------------------------------------------

    const { industry, weeklyAvailability } = req.body;
    //checking valid industry

    const industryExists = await Industry.findOne({
      _id: industry,
      isActive: true,
    });
    if (!industryExists) {
      return res.status(400).json({
        message: "Selected industry is not available",
      });
    }

    // checking valid weeklyAvailability ----------------------
    if (!weeklyAvailability || weeklyAvailability.length === 0) {
      return res.status(400).json({
        message: "Weekly availability is required",
      });
    }

    //Ensuring is all 7 days present
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

    const uniqueDays = new Set(providedDays);

    if (uniqueDays.size !== 7) {
      return res.status(400).json({
        message: "All 7 days availability must be provided",
      });
    }

    //Validating day names
    for (let day of providedDays) {
      if (!validDays.includes(day)) {
        return res.status(400).json({
          message: `Invalid day provided: ${day}`,
        });
      }
    }
    //-----------------------------------------------

    //now creating tenant but since tenant is getting created first time we will keep status pending
    // const tenant =await Tenant.create({ ownerId: userId, ...req.body });
    const tenant = await Tenant.create({
      ...req.body,
      ownerId: userId, //always wins // ...req.body was giving bug and was assigning new value to ownerId
    });

    return res.status(201).json({
      message: "Service provider application submitted successfully",
      tenantId: tenant._id,
      status: tenant.status,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: "You already have a pending application",
      });
    }
    console.log(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

// Get service provider application status ===========================================================================
const mongoose = require("mongoose");

exports.getApplicationStatus = async (req, res) => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.user.userId);

    console.log(
      "JWT userId:",
      req.user.userId,
      "isValidObjectId:",
      mongoose.isValidObjectId(req.user.userId),
    );

    // Pending first
    let tenant = await Tenant.findOne({
      ownerId,
      status: "pending",
    }).sort({ createdAt: -1 });

    // Approved
    if (!tenant) {
      tenant = await Tenant.findOne({
        ownerId,
        status: "approved",
      }).sort({ createdAt: -1 });
    }

    //Rejected
    if (!tenant) {
      tenant = await Tenant.findOne({
        ownerId,
        status: "rejected",
      }).sort({ createdAt: -1 });
    }

    // Blocked
    if (!tenant) {
      tenant = await Tenant.findOne({
        ownerId,
        status: "blocked",
      }).sort({ createdAt: -1 });
    }

    if (!tenant) {
      return res.status(404).json({
        message: "No application found",
      });
    }

    // Debug AFTER fetch
    return res.status(200).json({
      status: tenant.status,
      reason: tenant.statusMeta?.reason || null,
      appliedAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    });
  } catch (error) {
    console.error("getApplicationStatus error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get all applications =============================================================================
exports.getApplicationHistory = async (req, res) => {
  const ownerId = req.user.userId;

  const applications = await Tenant.find({ ownerId })
    .sort({ createdAt: -1 })
    .select("status statusMeta createdAt updatedAt");

  res.json(applications);
};
