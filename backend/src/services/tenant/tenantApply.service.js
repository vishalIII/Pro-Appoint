const User = require("../../models/user/user.model")
const Industry = require("../../models/service/industry/industry.model");
const Tenant = require("../../models/tenant/tenant.model")
exports.getActiveIndustries = async (req, res) => {
  try {
    const industries = await Industry.find({ isActive: true });
    return industries;
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.tenantApply = async (req, res) => {
  try {
    const userId = req.user.userId;

    //fetching user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    //if already user is provider
    if (user.role === "ServiceProvider") {
      return res.status(400).json({ message: "Already a service provider" });
    }
    //checking valid industry
    const { industry } = req.body;
    const industryExists = await Industry.findOne({
      name: industry
    });
    if (!industryExists) {
      return res.status(400).json({
        message: "Selected industry is not available",
      });
    }



    const tenant = await Tenant.create({ name: user.name, industry, ownerId: userId })
    user.role = "ServiceProvider";
    user.tenantId = tenant._id;
    await user.save();
    return tenant;

  } catch (err) {
    res.status(500).json({ message: err.message, "g": err })
  }
}
