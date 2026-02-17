const User = require("../../models/user/user.model");
const Tenant = require("../../models/tenant/tenant.model");
const AppError = require("../../utils/appError");
// =======================================================
// Create tenant service
// =======================================================
exports.createTenant = async (userId, plan) => {
  try{
  // 1. Fetch user
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }
  if(!plan){
    throw new AppError("Plan is required to create tenant", 400);
  }
  // 2. Prevent duplicate tenant
  if (user.tenantId) {
    throw new AppError("User already has a tenant", 400);
  }

  // 3. Trial setup (30 days)
  
  const trialStart = new Date();
  const trialEnd = new Date(trialStart);
  trialEnd.setFullYear(trialEnd.getFullYear() + 1);

  // 4. Create tenant
  const tenant = await Tenant.create({
    ownerId: userId,
    plan,
    planStatus: "active",
    trialStart,
    trialEnd,
  });

  // 5. Link tenant to user + role update
  user.tenantId = tenant._id;
  user.role = "ServiceProvider";
  await user.save();

  return {
    tenantId: tenant._id,
    trialEnd,
  };
}catch(error){throw new AppError(error.message || "Failed to create tenant", error.statusCode || 500); }
};
