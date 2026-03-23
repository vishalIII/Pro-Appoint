const walletService = require("../../services/wallet/wallet.service");
const AppError = require("../../utils/appError");

exports.getWalletBalance = async (req, res, next) => {
  try {
    const { tenantId } = req.tenant;
    const wallet = await walletService.getWalletBalance(tenantId);
    res.json({
      success: true,
      data: wallet,
    });
  } catch (error) {
    next(error);
  }
};

exports.getWalletTransactions = async (req, res, next) => {
  try {
    const { tenantId } = req.tenant;
    const { page = 1, limit = 10 } = req.query;
    const result = await walletService.getWalletTransactions(tenantId, { page: +page, limit: +limit });
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.topupWallet = async (req, res, next) => {
  try {
    const { tenantId } = req.tenant;
    const { amount } = req.body;
    const result = await walletService.topupWallet(tenantId, +amount, `Dummy top-up ₹${amount}`);
    res.json({
      success: true,
      data: result,
      message: "Wallet topped up successfully",
    });
  } catch (error) {
    next(error);
  }
};
