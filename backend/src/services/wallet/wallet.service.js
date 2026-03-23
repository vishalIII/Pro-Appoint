const mongoose = require("mongoose");
const Tenant = require("../../models/tenant/tenant.model");
const WalletTransaction = require("../../models/wallet/wallet.model");
const AppError = require("../../utils/appError");

exports.getWalletBalance = async (tenantId) => {
  const tenant = await Tenant.findById(tenantId).select("walletBalance").lean();
  if (!tenant) throw new AppError("Tenant not found", 404);
  return { balance: tenant.walletBalance || 0 };
};

exports.topupWallet = async (tenantId, amount, description = "Dummy top-up") => {
  if (amount < 10) throw new AppError("Minimum top-up ₹10", 400);
  return await updateWalletBalance(tenantId, amount, "topup", description);
};

exports.deductWallet = async (tenantId, amount, referenceId, description = "Payment deduction") => {
  if (amount <= 0) throw new AppError("Invalid amount", 400);
  return await updateWalletBalance(tenantId, -amount, "deduct", description, referenceId);
};

exports.refundWallet = async (tenantId, amount, referenceId, description = "Refund") => {
  if (amount <= 0) throw new AppError("Invalid amount", 400);
  return await updateWalletBalance(tenantId, amount, "refund", description, referenceId);
};

const updateWalletBalance = async (tenantId, delta, type, description, referenceId = null) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const tenant = await Tenant.findById(tenantId).session(session);
      if (!tenant) throw new AppError("Tenant not found", 404);

      const newBalance = Math.max(0, (tenant.walletBalance || 0) + delta);
      tenant.walletBalance = newBalance;
      await tenant.save({ session });

      await WalletTransaction.create([{
        tenantId,
        type,
        amount: Math.abs(delta),
        description,
        referenceId,
        balanceAfter: newBalance,
      }], { session });
    });
  } finally {
    await session.endSession();
  }

  return { balance: Math.max(0, (await exports.getWalletBalance(tenantId)).balance) };
};

exports.getWalletTransactions = async (tenantId, { page = 1, limit = 10 } = {}) => {
  const transactions = await WalletTransaction.find({ tenantId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("tenantId", "plan")
    .lean();
  const total = await WalletTransaction.countDocuments({ tenantId });
  return { transactions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};
