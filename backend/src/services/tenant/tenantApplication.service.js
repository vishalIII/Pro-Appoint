const User = require("../../models/user/user.model");
const Tenant = require("../../models/tenant/tenant.model");
const AppError = require("../../utils/appError");
const jwt = require("jsonwebtoken");

const { generateAccessToken } = require("../../utils/token");
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
  
  const subscriptionStart = new Date();
  const subscriptionEnd = new Date(subscriptionStart);
  subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);

  // 4. Create tenant
  const tenant = await Tenant.create({
    ownerId: userId,
    plan,
    planStatus: "active",
    subscriptionStart,
    subscriptionEnd,
  });

  // 5. Link tenant to user + role update
  user.tenantId = tenant._id;
  user.role = "ServiceProvider";
  await user.save();

const accessToken = generateAccessToken({
  _id: user._id,
  role: user.role,
  tenantId: tenant._id,
});

  return {
  tenantId: tenant._id,
  subscriptionEnd,
  accessToken, // ✅ renamed
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    tenantId: tenant._id,
    isVerified: user.isVerified,
  },
};
}catch(error){throw new AppError(error.message || "Failed to create tenant", error.statusCode || 500); }
};
