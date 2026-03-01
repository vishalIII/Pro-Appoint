const mongoose = require("mongoose");
const Review = require("../../models/review/review.model");
const Appointment = require("../../models/appointment/appointment.model");
const Shop = require("../../models/shop/shop.model");
const AppError = require("../../utils/appError");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const normalizeObjectId = (id) =>
  typeof id === "string" ? id.trim().replace(/^:/, "") : id;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const parsePage = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_PAGE;
  return parsed;
};

const parseLimit = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
};

const parseRating = (rating) => {
  const parsed = Number.parseInt(rating, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
    throw new AppError("rating must be an integer between 1 and 5", 400);
  }
  return parsed;
};

const normalizeComment = (comment) => {
  if (comment === undefined || comment === null) return undefined;
  if (typeof comment !== "string") {
    throw new AppError("comment must be a string", 400);
  }
  const trimmed = comment.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const getApprovedShop = async (shopId) => {
  const shop = await Shop.findOne({ _id: shopId, status: "approved" })
    .select("_id ratingAvg ratingCount ratingBreakdown")
    .lean();
  if (!shop) {
    throw new AppError("Shop not found", 404);
  }
  return shop;
};

const recomputeShopReviewSummary = async ({ shopId, session }) => {
  const shopObjectId = new mongoose.Types.ObjectId(shopId);

  const [summary] = await Review.aggregate([
    { $match: { shopId: shopObjectId, status: "active" } },
    {
      $group: {
        _id: null,
        ratingCount: { $sum: 1 },
        ratingAvg: { $avg: "$rating" },
        star1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
        star2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
        star3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
        star4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
        star5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
      },
    },
  ]).session(session);

  const shopSummary = {
    ratingAvg: summary?.ratingAvg
      ? Number(summary.ratingAvg.toFixed(2))
      : 0,
    ratingCount: summary?.ratingCount || 0,
    ratingBreakdown: {
      star1: summary?.star1 || 0,
      star2: summary?.star2 || 0,
      star3: summary?.star3 || 0,
      star4: summary?.star4 || 0,
      star5: summary?.star5 || 0,
    },
  };

  await Shop.updateOne(
    { _id: shopId },
    { $set: shopSummary },
    { session },
  );

  return shopSummary;
};

exports.createReviewForAppointment = async ({
  appointmentId: rawAppointmentId,
  reviewerId: rawReviewerId,
  payload,
}) => {
  const session = await mongoose.startSession();

  try {
    const appointmentId = normalizeObjectId(rawAppointmentId);
    const reviewerId = normalizeObjectId(rawReviewerId);

    if (!appointmentId || !isValidObjectId(appointmentId)) {
      throw new AppError("Invalid Appointment ID", 400);
    }
    if (!reviewerId || !isValidObjectId(reviewerId)) {
      throw new AppError("Invalid reviewer ID", 400);
    }

    const rating = parseRating(payload?.rating);
    const comment = normalizeComment(payload?.comment);

    let createdReview = null;
    let shopSummary = null;

    await session.withTransaction(async () => {
      const appointment = await Appointment.findById(appointmentId)
        .session(session)
        .select(
          "attendeeId tenantId shopId serviceId status paymentStatus",
        );

      if (!appointment) {
        throw new AppError("Appointment not found", 404);
      }

      if (String(appointment.attendeeId) !== String(reviewerId)) {
        throw new AppError(
          "You can only review your own appointment",
          403,
        );
      }

      if (appointment.status !== "completed") {
        throw new AppError(
          "Review is allowed only for completed appointments",
          400,
        );
      }

      if (appointment.paymentStatus !== "paid") {
        throw new AppError(
          "Review is allowed only for paid appointments",
          400,
        );
      }

      const shop = await Shop.findById(appointment.shopId)
        .session(session)
        .select("_id status");
      if (!shop || shop.status !== "approved") {
        throw new AppError("Shop not found", 404);
      }

      const existing = await Review.findOne({
        appointmentId: appointment._id,
      })
        .session(session)
        .select("_id")
        .lean();

      if (existing) {
        throw new AppError("Review already exists for this appointment", 409);
      }

      const [review] = await Review.create(
        [
          {
            appointmentId: appointment._id,
            tenantId: appointment.tenantId,
            shopId: appointment.shopId,
            serviceId: appointment.serviceId,
            reviewerId,
            rating,
            comment,
            status: "active",
          },
        ],
        { session },
      );

      createdReview = review;
      shopSummary = await recomputeShopReviewSummary({
        shopId: appointment.shopId,
        session,
      });
    });

    const review = await Review.findById(createdReview._id)
      .populate("reviewerId", "name")
      .populate("serviceId", "name")
      .lean();

    return { review, shopSummary };
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError("Review already exists for this appointment", 409);
    }
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to create review", 500);
  } finally {
    await session.endSession();
  }
};

exports.listShopReviews = async ({
  shopId: rawShopId,
  page,
  limit,
  sort,
}) => {
  try {
    const shopId = normalizeObjectId(rawShopId);
    if (!shopId || !isValidObjectId(shopId)) {
      throw new AppError("Invalid Shop ID", 400);
    }

    await getApprovedShop(shopId);

    const parsedPage = parsePage(page);
    const parsedLimit = parseLimit(limit);
    const skip = (parsedPage - 1) * parsedLimit;
    const sortBy =
      sort === "top"
        ? { rating: -1, createdAt: -1 }
        : { createdAt: -1 };

    const query = { shopId, status: "active" };
    const [count, reviews] = await Promise.all([
      Review.countDocuments(query),
      Review.find(query)
        .sort(sortBy)
        .skip(skip)
        .limit(parsedLimit)
        .populate("reviewerId", "name")
        .populate("serviceId", "name")
        .lean(),
    ]);

    return {
      count,
      page: parsedPage,
      limit: parsedLimit,
      reviews,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to fetch shop reviews", 500);
  }
};

exports.getShopReviewSummary = async ({ shopId: rawShopId }) => {
  try {
    const shopId = normalizeObjectId(rawShopId);
    if (!shopId || !isValidObjectId(shopId)) {
      throw new AppError("Invalid Shop ID", 400);
    }

    const shop = await getApprovedShop(shopId);
    return {
      shopId: shop._id,
      ratingAvg: shop.ratingAvg || 0,
      ratingCount: shop.ratingCount || 0,
      ratingBreakdown: {
        star1: shop.ratingBreakdown?.star1 || 0,
        star2: shop.ratingBreakdown?.star2 || 0,
        star3: shop.ratingBreakdown?.star3 || 0,
        star4: shop.ratingBreakdown?.star4 || 0,
        star5: shop.ratingBreakdown?.star5 || 0,
      },
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error.message || "Failed to fetch shop review summary",
      500,
    );
  }
};
