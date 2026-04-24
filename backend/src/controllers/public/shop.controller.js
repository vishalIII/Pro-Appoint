const Shop = require("../../models/shop/shop.model");
const Industry = require("../../models/service/industry/industry.model");
const reviewService = require("../../services/review/review.service");
exports.listShops = async (req, res, next) => {
  try {
    const shops = await Shop.find({ status: "approved" }).sort({ createdAt: -1 });
    return res.status(200).json({ count: shops.length, shops });
  } catch (error) {
    next(error);
  }
};
exports.getShopSearch = async (req, res, next) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const pipeline = [
      // Only approved shops
      { $match: { status: "approved" } },

      //  Join with Industry collection
      {
        $lookup: {
          from: "industries", // collection name in MongoDB
          localField: "industry",
          foreignField: "_id",
          as: "industry"
        }
      },

      //  Convert array → object
      { $unwind: "$industry" }
    ];

    // Search condition
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { shopName: { $regex: search, $options: "i" } },
            { "industry.name": { $regex: search, $options: "i" } }
          ]
        }
      });
    }

    //  Pagination + sorting
    pipeline.push(
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: parseInt(limit) }
          ],
          totalCount: [
            { $count: "count" }
          ]
        }
      }
    );

    const result = await Shop.aggregate(pipeline);

    const shops = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      shops
    });

  } catch (error) {
    next(error);
  }
};

exports.listActiveIndustriesPublic = async (req, res, next) => {
  try {
    const industries = await Industry.find({ isActive: true })
      .select("_id name")
      .sort({ name: 1 });

    return res.status(200).json({ count: industries.length, industries });
  } catch (error) {
    next(error);
  }
};

exports.getShopByIdPublic = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.shopId);
    if (!shop || shop.status !== "approved") return res.status(404).json({ message: "Shop not found" });
    return res.status(200).json(shop);
  } catch (error) {
    next(error);
  }
};

exports.getShopReviews = async (req, res, next) => {
  try {
    const data = await reviewService.listShopReviews({
      shopId: req.params.shopId,
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort,
    });
    return res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

exports.getShopReviewSummary = async (req, res, next) => {
  try {
    const summary = await reviewService.getShopReviewSummary({
      shopId: req.params.shopId,
    });
    return res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
};

exports.getShopsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const pipeline = [
      // Only approved shops
      { $match: { status: "approved" } },

      // Join with Industry collection
      {
        $lookup: {
          from: "industries",
          localField: "industry",
          foreignField: "_id",
          as: "industry"
        }
      },

      // Convert array → object
      { $unwind: "$industry" },

      // Match category
      { $match: { "industry.name": category } },

      // Pagination + sorting
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: parseInt(limit) }
          ],
          totalCount: [
            { $count: "count" }
          ]
        }
      }
    ];

    const result = await Shop.aggregate(pipeline);

    const shops = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      shops
    });
  } catch (error) {
    next(error);
  }
};
