const reviewService = require("../services/review/review.service");

exports.createShopReview = async (req, res, next) => {
  try {
    const { shopId, rating, comment } = req.body;
    const reviewerId = req.user.userId;

    const result = await reviewService.createReviewForShop({
      shopId,
      reviewerId,
      rating,
      comment
    });

    res.status(201).json({
      message: "Review created successfully",
      review: result.review
    });
  } catch (error) {
    next(error);
  }
};