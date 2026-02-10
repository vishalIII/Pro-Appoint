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

    // 5. Link tenant to user
    user.tenantId = tenant._id;
    user.role = "ServiceProvider";
    await user.save();

    return res.status(201).json({
      message: "Tenant created with 1-month free trial",
      tenantId: tenant._id,
      trialEndsOn: trialEnd,
    });

  } catch (error) {
    console.error("createTenant error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
