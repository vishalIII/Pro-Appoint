const Tenant = require("../../models/tenant/tenant.model");

//get own tenant ------------------------------------------------------------
exports.getOwnTenant = async (req, res) => {
  try {
    const tenant = Tenant.findById(req.user.tenantId);

    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    return res.status(200).json(tenant);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "server error" });
  }
};

//update tenant -------------------------------------------------------------
exports.updateOwnTenant = async (req, res) => {
  try {
    const allowedUpdates = [
      "description",
      "images",
      "contactEmail",
      "contactPhone",
      "address",
      "weeklyAvailability"
    ];

    //--------------------------------------Specifically validating for weeklyAvailability
    const {weeklyAvailability}=req.body;
    if (weeklyAvailability !== undefined) {
      if (!Array.isArray(weeklyAvailability) || weeklyAvailability.length === 0) {
        return res.status(400).json({ message: "Weekly availability cannot be empty" });
      }

      const validDays = [
        "monday","tuesday","wednesday",
        "thursday","friday","saturday","sunday"
      ];

      const days = weeklyAvailability.map(d => d.day);
      if (new Set(days).size !== 7) {
        return res.status(400).json({ message: "All 7 days availability required" });
      }

      for (let day of days) {
        if (!validDays.includes(day)) {
          return res.status(400).json({ message: `Invalid day: ${day}` });
        }
      }
    }
    // -----------------------------------------------------------------

    const updates = {}; //only valid and provided updates we will update
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field]; // Objects allow dynamic key–value assignment using variable keys
      }
    });

    const tenant = await Tenant.findByIdAndUpdate(
      req.user.tenantId,
      { $set: updates },  //It will update only valid fiels and will keep remaining as it is
      { new: true },
    );

    if (!tenant) {
      return res.status(404).json({ message: "tenant not found" });
    }

    return res.status(200).json({
      message: "Tenant updated successfully",
      tenant,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "server error" });
  }
};
