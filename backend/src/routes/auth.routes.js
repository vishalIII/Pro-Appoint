const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/auth.controller");

router.get("/", (req, res) => {
  res.send("Auth Home API working");
});

router.post("/register", register);
router.post("/login", login);

module.exports = router;
