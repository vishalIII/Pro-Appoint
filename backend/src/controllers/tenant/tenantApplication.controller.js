const Tenant = require("../../models/tenant/tenant.model")
const User = require("../../models/user/user.model")
const Industry = require("../../models/service/industry/industry.model");
const tenantApplyService = require("../../services/tenant/tenantApply.service")


//get active industries
exports.getActiveIndustries = async (req, res) => {
  try {
    const industries = await tenantApplyService.getActiveIndustries(req,res);
    res.json(industries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Post - apply for service provider
exports.applyProvider = async (req, res) => {
  try {
    
    const tenant=await tenantApplyService.tenantApply(req,res)
    return res.status(201).json({
      message: "Service provider application submitted successfully",
      tenantId: tenant._id
    })
    

  } catch (error) {
      console.log(error)
      return res.status(500).json({message:error.message})
  }
};

