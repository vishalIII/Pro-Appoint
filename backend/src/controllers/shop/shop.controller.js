const Shop = require("../../models/shop/shop.model");

// get own shop ------------------------------------------------------------
exports.getOwnShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.user.shopId); // ✅ await added

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    return res.status(200).json(shop);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

// update own shop ---------------------------------------------------------
exports.updateOwnShop = async (req, res) => {
  try {
    const allowedUpdates = [
      "description",
      "images",
      "contactEmail",
      "contactPhone",
      "address",
      "weeklyAvailability",
    ];

    // ---------- Validate weeklyAvailability (only if provided)
    const { weeklyAvailability } = req.body || {};

    if (weeklyAvailability !== undefined) {
      if (!Array.isArray(weeklyAvailability) || weeklyAvailability.length === 0) {
        return res
          .status(400)
          .json({ message: "Weekly availability cannot be empty" });
      }

      const validDays = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];

      const days = weeklyAvailability.map((d) => d.day);

      if (new Set(days).size !== 7) {
        return res
          .status(400)
          .json({ message: "All 7 days availability required" });
      }

      for (let day of days) {
        if (!validDays.includes(day)) {
          return res.status(400).json({ message: `Invalid day: ${day}` });
        }
      }
    }
    // ----------------------------------------------------------

    const updates = {};
    allowedUpdates.forEach((field) => {
      if (req.body?.[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const shop = await Shop.findByIdAndUpdate(
      req.user.shopId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    return res.status(200).json({
      message: "Shop updated successfully",
      shop,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};
