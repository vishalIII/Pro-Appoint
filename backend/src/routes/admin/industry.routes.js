const express = require("express");
const router = express.Router();
const { createIndustry,getAllIndustries,updateIndustry,toggleIndustryStatus,deleteIndustry} = require("../../controllers/admin/industry.controller");

router.get("/", (req, res) => {
  res.send("industry API working");
});

router.post("/create", createIndustry);

router.get("/get-all", getAllIndustries);

router.patch("/update/:id", updateIndustry);

router.patch("/toggle-status/:id", toggleIndustryStatus);

router.delete("/delete/:id", deleteIndustry);

module.exports = router;
