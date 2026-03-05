const dashboardService = require("../../services/dashboard/dashboard.service");

exports.getSummary = async (req, res, next) => {
  try {
    const payload = await dashboardService.getDashboardSummary({
      tenantId: req.user.tenantId,
      shopId: req.query.shopId,
      from: req.query.from,
      to: req.query.to,
    });

    return res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

exports.getRevenue = async (req, res, next) => {
  try {
    const payload = await dashboardService.getRevenueAnalytics({
      tenantId: req.user.tenantId,
      shopId: req.query.shopId,
      range: req.query.range,
    });

    return res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

exports.getServicePerformance = async (req, res, next) => {
  try {
    const payload = await dashboardService.getServicePerformance({
      tenantId: req.user.tenantId,
      shopId: req.query.shopId,
    });

    return res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

exports.getResourceUtilization = async (req, res, next) => {
  try {
    const payload = await dashboardService.getResourceUtilization({
      tenantId: req.user.tenantId,
      shopId: req.query.shopId,
      date: req.query.date,
    });

    return res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};
