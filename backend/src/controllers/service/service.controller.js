const serviceService = require("../../services/service/service.service");

/* --------------------------------------------------
   CREATE SERVICE
-------------------------------------------------- */
exports.createService = async (req, res, next) => {
  try {
    const { shopId } = req.params;

    const service = await serviceService.createService({
      tenantId: req.user.tenantId,
      shopId,
      name: req.body.name,
      description: req.body.description,
      weeklyAvailability: req.body.weeklyAvailability,
      category: req.body.category,
      images: req.body.images,
      capacity: req.body.capacity,
      discountPercentage: req.body.discountPercentage,
      price: req.body.price,
      durationMinutes: req.body.durationMinutes,
      requiredResources: req.body.requiredResources,
    });

    res.status(201).json(service);
  } catch (error) {
    next(error);
  }
};

/* --------------------------------------------------
   GET SERVICES
-------------------------------------------------- */
exports.getMyServices = async (req, res, next) => {
  try {
    const { shopId } = req.params;

    const services = await serviceService.getMyServices({
      tenantId: req.user.tenantId,
      shopId,
    });

    res.json({
      count: services.length,
      services,
    });
  } catch (error) {
    next(error);
  }
};

/* --------------------------------------------------
   GET SERVICE BY ID
-------------------------------------------------- */
exports.getServiceById = async (req, res, next) => {
  try {
    const { shopId, serviceId } = req.params;

    const service = await serviceService.getServiceById({
      tenantId: req.user.tenantId,
      shopId,
      serviceId,
    });

    res.json(service);
  } catch (error) {
    next(error);
  }
};

/* --------------------------------------------------
   UPDATE SERVICE
-------------------------------------------------- */
exports.updateService = async (req, res, next) => {
  try {
    const { shopId, serviceId } = req.params;

    const service = await serviceService.updateService({
      tenantId: req.user.tenantId,
      shopId,
      serviceId,
      name: req.body.name,
      description: req.body.description,
      weeklyAvailability: req.body.weeklyAvailability,
      category: req.body.category,
      images: req.body.images,
      isActive: req.body.isActive,
      capacity: req.body.capacity,
      discountPercentage: req.body.discountPercentage,
      price: req.body.price,
      durationMinutes: req.body.durationMinutes,
      requiredResources: req.body.requiredResources,
    });

    res.json({
      message: "Service updated successfully",
      service,
    });
  } catch (error) {
    next(error);
  }
};

/* --------------------------------------------------
   DELETE SERVICE
-------------------------------------------------- */
exports.deleteService = async (req, res, next) => {
  try {
    const { shopId, serviceId } = req.params;

    await serviceService.deleteService({
      tenantId: req.user.tenantId,
      shopId,
      serviceId,
    });

    res.json({
      message: "Service deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
