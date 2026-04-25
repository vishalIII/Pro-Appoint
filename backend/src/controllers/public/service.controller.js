const Service = require("../../models/service/service.model");
const Shop = require("../../models/shop/shop.model");

exports.listServices = async (req, res, next) => {
  try {
    const shop = await Shop.findOne({
      _id: req.params.shopId,
      status: "approved",
    }).select("_id");

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const services = await Service.find({ shopId: req.params.shopId, isActive: true }).sort({ createdAt: -1 });
    return res.status(200).json({ count: services.length, services });
  } catch (error) {
    next(error);
  }
};

exports.getServiceByIdPublic = async (req, res, next) => {
  try {
    const shop = await Shop.findOne({
      _id: req.params.shopId,
      status: "approved",
    }).select("_id timezone");

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const service = await Service.findOne({ _id: req.params.serviceId, shopId: req.params.shopId, isActive: true });
    if (!service) return res.status(404).json({ message: "Service not found" });
    const payload = service.toObject();
    payload.providerTimezone = shop.timezone || "UTC";
    return res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};
