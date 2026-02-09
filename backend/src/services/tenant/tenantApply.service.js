const User = require("../../models/user/user.model")
const Industry = require("../../models/service/industry/industry.model");
const Tenant = require("../../models/tenant/tenant.model")
const aapError = require("../../utils/appError");
const AppError = require("../../utils/appError");
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
      throw new AppError("User not found", 404);
    }
    

    //if already user is provider
    if (user.role === "ServiceProvider") {
      throw new AppError("User is already a service provider", 400);
    }
    //checking valid industry
    
    const industryExists = await Industry.findOne({
      name: industry
    });
    if (!industryExists) {
      throw new AppError("Invalid industry", 400);
    }



    const tenant = await Tenant.create({ name: user.name, industry, ownerId: userId })
    user.role = "ServiceProvider";
    user.tenantId = tenant._id;
    await user.save();
    return tenant;

  } catch (err) {
    throw new AppError(err.message || "Failed to apply for service provider", err.statusCode || 500);
  }
}
