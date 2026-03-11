const express = require("express");
const router = express.Router();
const {
  list,
  markAsRead,
  markAllAsRead,
} = require("../../controllers/notification/notification.controller");

router.get("/", list);
router.patch("/:notificationId/read", markAsRead);
router.patch("/read-all", markAllAsRead);

module.exports = router;
