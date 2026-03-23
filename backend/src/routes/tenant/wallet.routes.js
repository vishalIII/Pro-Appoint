const express = require("express");
const router = express.Router();
const walletController = require("../../controllers/tenant/wallet.controller");
const tenantAuthMiddleware = require("../../middlewares/tenant/tenantAuth.middleware");

router.use(tenantAuthMiddleware);

router.get("/balance", walletController.getWalletBalance);
router.get("/transactions", walletController.getWalletTransactions);
router.post("/topup", walletController.topupWallet);

module.exports = router;
