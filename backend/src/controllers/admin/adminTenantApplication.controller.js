const Tenant = require("../../models/tenant/tenant.model");
const User = require("../../models/user/user.model");
const adminApprovalService = require("../../services/admin/adminApproval.service")
//get all tenanta applications --------------------------------------------
exports.getAllTenantApplications = async (req, res) => {
  try {
    const tenants = await adminApprovalService.getTenantApplications();
    return res.status(200).json(tenants);
  } catch (error) {
   next(error);
  }
};

