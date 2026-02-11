const serviceService = require("../../services/service/service.service");

// =======================================================
// CREATE SERVICE
// =======================================================
exports.createService = async (req, res, next) => {
  try {
    const service = await serviceService.createService({
      tenantId: req.user.tenantId,
      name: req.body.name,
      weeklyAvailability: req.body.weeklyAvailability,
      category: req.body.category,
      images: req.body.images,
    });

    res.status(201).json(service);
  } catch (error) {
    next(error);
  }
};

// =======================================================
// GET SERVICES
// =======================================================
exports.getMyServices = async (req, res, next) => {
  try {
    const services = await serviceService.getMyServices(
      req.user.tenantId
    );

    res.status(200).json({
      count: services.length,
      services,
    });
  } catch (error) {
    next(error);
  }
};

// =======================================================
// UPDATE SERVICE
// =======================================================
exports.updateService = async (req, res, next) => {
  try {
    const service = await serviceService.updateService({
      serviceId: req.params.id,
      tenantId: req.user.tenantId,
      name: req.body.name,
      weeklyAvailability: req.body.weeklyAvailability,
      category: req.body.category,
      images: req.body.images,
      isActive: req.body.isActive,
    });

    res.status(200).json({
      message: "Service updated successfully",
      service,
    });
  } catch (error) {
    next(error);
  }
};
