const resourceService = require("../../services/resource/resource.service");

exports.createResource = async (req, res, next) => {
  try {
    const resource = await resourceService.createResource({
      tenantId: req.user.tenantId,
      shopId: req.params.shopId,
      name: req.body.name,
      type: req.body.type,
      capacity: req.body.capacity,
      metadata: req.body.metadata,
    });

    return res.status(201).json(resource);
  } catch (error) {
    next(error);
  }
};

exports.getResources = async (req, res, next) => {
  try {
    const resources = await resourceService.getResources({
      tenantId: req.user.tenantId,
      shopId: req.params.shopId,
      type: req.query.type,
      isActive: req.query.isActive,
    });

    return res.status(200).json({
      count: resources.length,
      resources,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateResource = async (req, res, next) => {
  try {
    const resource = await resourceService.updateResource({
      tenantId: req.user.tenantId,
      shopId: req.params.shopId,
      resourceId: req.params.resourceId,
      updatePayload: req.body || {},
    });

    return res.status(200).json({
      message: "Resource updated successfully",
      resource,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteResource = async (req, res, next) => {
  try {
    await resourceService.deleteResource({
      tenantId: req.user.tenantId,
      shopId: req.params.shopId,
      resourceId: req.params.resourceId,
    });

    return res.status(200).json({ message: "Resource deactivated" });
  } catch (error) {
    next(error);
  }
};
