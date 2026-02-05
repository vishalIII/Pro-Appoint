const Tenant = require("../../models/tenant/tenant.model");
const User = require("../../models/user/user.model");
const Industry = require("../../models/service/industry/industry.model");

//get active industries
exports.getActiveIndustries = async (req, res) => {
  try {
    const industries = await Industry.find({ isActive: true });
    res.json(industries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Post - apply for service provider
exports.applyProvider = async (req, res) => {
  try {
    const userId = req.user.userId;

    //fetching user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    //if already user is provider
    if (user.role === "ServiceProvider") {
      return res.status(400).json({ message: "Already a service provider" });
    }

    //service provider can only create n number of shops
    const shopCount = await Tenant.countDocuments({ ownerId: userId });
    if (shopCount >= 1) {
      return res.status(400).json({
        message: "You can create a maximum of 1 shops only",
      });
    }

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
    const tenant = Tenant.create({ ownerId: userId, ...req.body });

    return res.status(201).json({
      message: "Service provider application submitted successfully",
      tenantId: tenant._id,
      status: tenant.status,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

// Get service provider application status ------------------------------------------------------------
const mongoose = require("mongoose");

exports.getApplicationStatus = async (req, res) => {
  try {
    const tenant = await Tenant.findOne({
      ownerId: new mongoose.Types.ObjectId(req.user.userId),
    });

    if (!tenant) {
      return res.status(404).json({
        message: "Service provider application not found",
      });
    }

    return res.status(200).json({
      status: tenant.status,
      reason: tenant.statusMeta?.reason || null,
      updatedAt: tenant.updatedAt,
    });
  } catch (error) {
    console.error("getApplicationStatus error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


