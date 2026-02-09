const User = require("../../models/user/user.model");
const Tenant = require("../../models/tenant/tenant.model");

exports.createTenant = async (req, res) => {
  try {
    const userId = req.user.userId;

    // 1. Fetch user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Prevent duplicate tenant
    if (user.tenantId) {
      return res.status(400).json({
        message: "Tenant already exists for this user",
        tenantId: user.tenantId,
      });
    }

    // 3. Create tenant
    const tenant = await Tenant.create({
      ownerId: userId,
      plan: user.plan || "free",
    });

    // 4. Link tenant to user
    user.tenantId = tenant._id;
    user.role = "ServiceProvider"; // optional but recommended
    await user.save();

    return res.status(201).json({
      message: "Tenant created successfully",
      tenantId: tenant._id,
    });

  } catch (error) {
    console.error("createTenant error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
