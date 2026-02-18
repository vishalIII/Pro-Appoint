const express = require("express");
const router = express.Router();

router.get("/",(req,res)=>{
    res.send("Payment Home API working");
})

module.exports = router;