const Service = require("../../models/service/service.model");

exports.listServices = async (req, res, next) => {
  try {
    const services = await Service.find({ shopId: req.params.shopId, isActive: true }).sort({ createdAt: -1 });
    return res.status(200).json({ count: services.length, services });
  } catch (error) {
    next(error);
  }
};

exports.getServiceByIdPublic = async (req, res, next) => {
  try {
    const service = await Service.findOne({ _id: req.params.serviceId, shopId: req.params.shopId, isActive: true });
    if (!service) return res.status(404).json({ message: "Service not found" });
    return res.status(200).json(service);
  } catch (error) {
    next(error);
  }
};
