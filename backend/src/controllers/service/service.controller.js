const serviceService = require("../../services/service/service.service");

//post ---------------------------------------CREATE SERVICE
exports.createService = async (req, res) => {
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


//Get ---------------------------------------GET SERVICES
exports.getMyServices = async (req, res) => {
  try {
    const services = await serviceService.getMyServices(req.user.tenantId);

    res.json({
      count: services.length,
      services,
    });
  } catch (error) {
    next(error);
  }
};


//Patch ---------------------------------------UPDATE SERVICE
exports.updateService = async (req, res) => {
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

    res.json({
      message: "Service updated successfully",
      service,
    });
  } catch (error) {
    next(error);
  }
};
