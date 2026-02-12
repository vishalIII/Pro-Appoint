const User = require("../../models/user/user.model");
const Tenant = require("../../models/tenant/tenant.model");
const AppError = require("../../utils/appError");
// =======================================================
// Create tenant service
// =======================================================
exports.createTenant = async (userId) => {
  try{
  // 1. Fetch user
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  // 2. Prevent duplicate tenant
  if (user.tenantId) {
    throw new AppError("User already has a tenant", 400);
  }

  // 3. Trial setup (30 days)
  const trialDays = 30;
  const trialStart = new Date();
  const trialEnd = new Date(
    trialStart.getTime() + trialDays * 24 * 60 * 60 * 1000
  );

  // 4. Create tenant
  const tenant = await Tenant.create({
    ownerId: userId,
    plan: "free",
    planStatus: "trial",
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
