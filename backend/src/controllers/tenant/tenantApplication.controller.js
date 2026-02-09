const Tenant = require("../../models/tenant/tenant.model")
const User = require("../../models/user/user.model")
const Industry = require("../../models/service/industry/industry.model");
const tenantApplyService = require("../../services/tenant/tenantApply.service")


//get active industries
exports.getActiveIndustries = async (req, res) => {
  try {
    const industries = await tenantApplyService.getActiveIndustries();
    res.json(industries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Post - apply for service provider
exports.applyProvider = async (req, res,next) => {
  try {
    const userId = req.user.userId;
    const { industry } = req.body;
    const tenant = await tenantApplyService.tenantApply(userId, industry)
    return res.status(201).json({
      message: "Service provider application submitted successfully",
      tenantId: tenant._id
    })


  } catch (error) {
    next(error);
  }
};

