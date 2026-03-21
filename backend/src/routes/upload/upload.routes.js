const express = require("express");
const router = express.Router();
const { getUploadSignature } = require("../../controllers/upload/upload.controller");

router.post("/signature", getUploadSignature);

module.exports = router;
