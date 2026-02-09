const User = require("../../models/user/user.model")
const Industry = require("../../models/service/industry/industry.model");
const Tenant = require("../../models/tenant/tenant.model")
exports.getActiveIndustries = async () => {
  try {
    const industries = await Industry.find({ isActive: true });
    return industries;
  } catch (err) {
    throw err;
  }
}

exports.tenantApply = async (userId,industry) => {
  try {
    

    //fetching user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    

    //if already user is provider
    if (user.role === "ServiceProvider") {
      throw new Error("Already a service provider");
    }
    //checking valid industry
    
    const industryExists = await Industry.findOne({
      name: industry
    });
    if (!industryExists) {
      throw new Error("Invalid industry");
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
