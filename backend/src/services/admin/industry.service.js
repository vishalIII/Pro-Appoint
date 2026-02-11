const Industry = require("../../models/service/industry/industry.model");
const AppError = require("../../utils/appError");

// Create Industry
exports.createIndustry = async (name) => {
  try {
    if (!name) {
      throw new AppError("Industry name is required", 400);
    }

    const existing = await Industry.findOne({
      name: name.toLowerCase(),
    });

    if (existing) {
      throw new AppError("Industry already exists", 409);
    }

    return await Industry.create({ name: name.toLowerCase() });

  } catch (error) {
    throw new AppError(
      error.message || "Failed to create industry",
      error.statusCode || 500
    );
  }
};

// Get All Industries
exports.getAllIndustries = async () => {
  try {
    return await Industry.find().sort({ createdAt: 1 });
  } catch (error) {
    throw new AppError(
      error.message || "Failed to fetch industries",
      error.statusCode || 500
    );
  }
};

// Update Industry
exports.updateIndustry = async (id, data) => {
  try {
    const industry = await Industry.findById(id);

    if (!industry) {
      throw new AppError("Industry not found", 404);
    }

    if (data.name) {
      industry.name = data.name.toLowerCase();
    }

    if (typeof data.isActive === "boolean") {
      industry.isActive = data.isActive;
    }

    await industry.save();
    return industry;

  } catch (error) {
    throw new AppError(
      error.message || "Failed to update industry",
      error.statusCode || 500
    );
  }
};

// Toggle Industry Status
exports.toggleIndustryStatus = async (id) => {
  try {
    const industry = await Industry.findById(id);

    if (!industry) {
      throw new AppError("Industry not found", 404);
    }

    industry.isActive = !industry.isActive;
    await industry.save();

    return industry;

  } catch (error) {
    throw new AppError(
      error.message || "Failed to toggle industry status",
      error.statusCode || 500
    );
  }
};

// Delete Industry
exports.deleteIndustry = async (id) => {
  try {
    const industry = await Industry.findByIdAndDelete(id);

    if (!industry) {
      throw new AppError("Industry not found", 404);
    }

    return industry;

  } catch (error) {
    throw new AppError(
      error.message || "Failed to delete industry",
      error.statusCode || 500
    );
  }
};
