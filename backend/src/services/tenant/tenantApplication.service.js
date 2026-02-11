const User = require("../../models/user/user.model");
const Tenant = require("../../models/tenant/tenant.model");

// =======================================================
// Create tenant service
// =======================================================
exports.createTenant = async (userId) => {
  // 1. Fetch user
  const user = await User.findById(userId);
  if (!user) {
    throw { status: 404, message: "User not found" };
  }

  // 2. Prevent duplicate tenant
  if (user.tenantId) {
    throw {
      status: 400,
      message: "Tenant already exists for this user",
    };
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
};
