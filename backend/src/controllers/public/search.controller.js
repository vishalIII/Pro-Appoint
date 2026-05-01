const Service = require("../../models/service/service.model");

// ----------------------
// HELPERS
// ----------------------
const escapeRegExp = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseNumber = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const safeString = (val) =>
  typeof val === "string" ? val.trim() : "";

// ----------------------
// CONTROLLER
// ----------------------
exports.searchServices = async (req, res, next) => {
  try {
    const {
      service,
      location,
      minPrice,
      maxPrice,
      minRating,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    const serviceValue = safeString(service);
    const locationValue = safeString(location);

    // ----------------------
    // BASE MATCH
    // ----------------------
    const matchStage = { isActive: true };

    const minPriceValue = parseNumber(minPrice);
    const maxPriceValue = parseNumber(maxPrice);

    if (minPriceValue !== undefined || maxPriceValue !== undefined) {
      matchStage.price = {};
      if (minPriceValue !== undefined) matchStage.price.$gte = minPriceValue;
      if (maxPriceValue !== undefined) matchStage.price.$lte = maxPriceValue;
    }

    // ----------------------
    // MAIN PIPELINE
    // ----------------------
    const pipeline = [
      { $match: matchStage },

      {
        $lookup: {
          from: "shops",
          localField: "shopId",
          foreignField: "_id",
          as: "shop",
        },
      },

      { $unwind: "$shop" },

      {
        $match: {
          "shop.status": "approved",

          // SERVICE SEARCH
          ...(serviceValue && {
            $or: [
              { name: { $regex: escapeRegExp(serviceValue), $options: "i" } },
              { category: { $regex: escapeRegExp(serviceValue), $options: "i" } },
              { "shop.shopName": { $regex: escapeRegExp(serviceValue), $options: "i" } },
            ],
          }),

          // LOCATION SEARCH (TYPO FRIENDLY)
          ...(locationValue && {
            "shop.address.city": {
              $regex: locationValue.split("").join(".*"),
              $options: "i",
            },
          }),
        },
      },
    ];

    // ----------------------
    // RATING FILTER
    // ----------------------
    const minRatingValue = parseNumber(minRating);
    if (minRatingValue !== undefined) {
      pipeline.push({
        $match: {
          "shop.ratingAvg": { $gte: minRatingValue },
        },
      });
    }

    // ----------------------
    // SORT
    // ----------------------
    const sortOption = {};
    if (sort === "highestRating") {
      sortOption["shop.ratingAvg"] = -1;
    } else if (sort === "highestPrice") {
      sortOption.price = -1;
    } else {
      sortOption.price = 1;
    }

    pipeline.push({ $sort: sortOption });

    // ----------------------
    // PAGINATION
    // ----------------------
    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));

    const paginatedPipeline = [
      ...pipeline,
      { $skip: (pageNumber - 1) * pageSize },
      { $limit: pageSize },
    ];

    let services = await Service.aggregate(paginatedPipeline);

    // ----------------------
    // FALLBACK LOGIC
    // ----------------------
    let isFallback = false;

    if (services.length === 0) {
      isFallback = true;

      const fallbackPipeline = [
        { $match: { isActive: true } },

        {
          $lookup: {
            from: "shops",
            localField: "shopId",
            foreignField: "_id",
            as: "shop",
          },
        },

        { $unwind: "$shop" },

        {
          $match: {
            "shop.status": "approved",
          },
        },

        { $sort: { "shop.ratingAvg": -1 } },
        { $limit: pageSize },
      ];

      services = await Service.aggregate(fallbackPipeline);
    }

    const total = services.length;

    // ----------------------
    // RESPONSE
    // ----------------------
    const results = services.map((doc) => ({
      service: {
        _id: doc._id,
        name: doc.name,
        category: doc.category,
        price: doc.price,
        images: doc.images,
        durationMinutes: doc.durationMinutes,
      },
      shop: {
        _id: doc.shop._id,
        shopName: doc.shop.shopName,
        images: doc.shop.images,
        address: doc.shop.address,
        ratingAvg: doc.shop.ratingAvg,
      },
    }));

    return res.status(200).json({
      total,
      page: pageNumber,
      limit: pageSize,
      results,
      fallback: isFallback, 
    });
  } catch (error) {
    console.error("SEARCH ERROR:", error);
    next(error);
  }
};