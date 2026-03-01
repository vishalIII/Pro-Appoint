const express = require("express");
const router = express.Router({ mergeParams: true });
const validateShopOwnershipMiddleware = require("../../middlewares/service/validateShopOwnership.middleware");
const {
  createResource,
  getResources,
  updateResource,
  deleteResource,
} = require("../../controllers/resource/resource.controller");

router.post("/", validateShopOwnershipMiddleware, createResource);
router.get("/", validateShopOwnershipMiddleware, getResources);
router.patch(
  "/:resourceId",
  validateShopOwnershipMiddleware,
  updateResource,
);
router.delete(
  "/:resourceId",
  validateShopOwnershipMiddleware,
  deleteResource,
);

module.exports = router;
