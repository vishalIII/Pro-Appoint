const Service = require("../../models/service/service.model");

//post ---------------------------------------CREATE SERVICE
exports.createService = async (req, res) => {
  try {
    const { name, weeklyAvailability, category, images } = req.body;

    // name validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        message: "name is required"
      });
    }

    //Presence validation
    if (!weeklyAvailability || weeklyAvailability.length === 0) {
      return res.status(400).json({
        message: "Weekly availability is required"
      });
    }

    //Ensuring is all 7 days present
    const validDays = [
      "monday","tuesday","wednesday",
      "thursday","friday","saturday","sunday"
    ];

    const providedDays = weeklyAvailability.map(d => d.day);

    const uniqueDays = new Set(providedDays);

    if (uniqueDays.size !== 7) {
      return res.status(400).json({
        message: "All 7 days availability must be provided"
      });
    }

    //Validating day names
    for (let day of providedDays) {
      if (!validDays.includes(day)) {
        return res.status(400).json({
          message: `Invalid day provided: ${day}`
        });
      }
    }

    // After all validation Creating service
    const service = await Service.create({
      tenantId: req.user.tenantId,
      name,
      weeklyAvailability,
      category,
      images
    });

    res.status(201).json(service);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


//Get ---------------------------------------GET SERVICES
exports.getMyServices = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const services = await Service.find({ tenantId })
      .sort({ createdAt: -1 }); // newest first (optional)

    res.json({
      count: services.length,
      services
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


//Patch ---------------------------------------UPDATE SERVICE
exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, weeklyAvailability, category, images, isActive } = req.body;

    if (name !== undefined && name.trim().length === 0) {
      return res.status(400).json({ message: "name cannot be empty" });
    }

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

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (weeklyAvailability !== undefined) updateData.weeklyAvailability = weeklyAvailability;
    if (category !== undefined) updateData.category = category;
    if (images !== undefined) updateData.images = images;
    if (isActive !== undefined) updateData.isActive = isActive;

    const service = await Service.findOneAndUpdate(
      {
        _id: id,
        tenantId: req.user.tenantId
      },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json({
      message: "Service updated successfully",
      service
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
