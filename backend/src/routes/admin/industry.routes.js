const express = require("express");
const router = express.Router();
const { createIndustry,getAllIndustries,updateIndustry,toggleIndustryStatus,deleteIndustry} = require("../../controllers/admin/industry.controller");

router.get("/check", (req, res) => {
  res.send("industry API working");
});

router.post("/", createIndustry);

router.get("/", getAllIndustries);

router.patch("/:id", updateIndustry);

router.patch("/toggle-status/:id", toggleIndustryStatus);

router.delete("/:id", deleteIndustry);

module.exports = router;
