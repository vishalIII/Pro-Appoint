const subscriptionService = require("../../services/tenant/subscription.service");

exports.getSubscription = async (req, res, next) => {
  try {
    const data = await subscriptionService.getTenantSubscription({
      tenantId: req.user.tenantId,
    });

    return res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};
