const Tenant = require("../../models/tenant/tenant.model");
const User = require("../../models/user/user.model");
const adminApprovalService = require("../../services/admin/adminApproval")
//get all tenanta applications --------------------------------------------
exports.getAllTenantApplications = async (req, res) => {
  try {
    const tenants = await adminApprovalService.getTenantApplications(req,res);
    return res.status(200).json(tenants);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "server Error" });
  }
};

//approve tenant -----------------------------------------------------------
exports.approveTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tenant = await Tenant.findById(tenantId);

    if (!tenant) {
      return res.status(404).json({ message: "tenant not found" });
    }

    if (tenant.status === "approved") {
      return res.status(400).json({ message: "Tenant already approved" });
    }

    //updating tenant
    tenant.status = "approved";
    tenant.statusMeta = undefined;

    await tenant.save();

    //updating user to tenant
    const user = await User.findById(tenant.ownerId);
    if (user) {
      user.role = "ServiceProvider";
      user.tenantId = tenant._id;
      await user.save();
    }

    return res.status(200).json({
      message: "Tenant approved successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

//Reject Tenant -------------------------------------------------------------
exports.rejectTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tenant = await Tenant.findById(tenantId);
    const { reason } = req.body;

    if (!tenant) {
      return res.status(404).json({ message: "tenant not found" });
    }

    if (tenant.status === "rejected") {
      return res.status(400).json({ message: "Tenant already rejected" });
    }

    //updating tenant
    await Tenant.findByIdAndUpdate(
      tenantId,
      {
        status: "rejected",
        statusMeta: {
          reason: reason || "rejected by admin",
          by: req.user._id,
          at: new Date(),
        },
      },
      { runValidators: true },
      //without this option, MongoDB will accept almost anything , any body, even if it breaks your schema.
    );

    return res.status(200).json({
      message: "Tenant rejected successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error in rejectTenant " });
  }
};
