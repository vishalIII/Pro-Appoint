const industryService = require("../../services/admin/industry.service");

// Create Industry
exports.createIndustry = async (req, res, next) => {
  try {
    const industry = await industryService.createIndustry(req.body.name);

    res.status(201).json({
      message: "Industry created successfully",
      industry,
    });
  } catch (error) {
    next(error);
  }
};

// Get All Industries
exports.getAllIndustries = async (req, res, next) => {
  try {
    const industries = await industryService.getAllIndustries();

    res.status(200).json({ industries });
  } catch (error) {
    next(error);
  }
};

// Update Industry
exports.updateIndustry = async (req, res, next) => {
  try {
    const industry = await industryService.updateIndustry(
      req.params.id,
      req.body
    );

    res.status(200).json({
      message: "Industry updated successfully",
      industry,
    });
  } catch (error) {
    next(error);
  }
};

// Toggle Industry Status
exports.toggleIndustryStatus = async (req, res, next) => {
  try {
    const industry = await industryService.toggleIndustryStatus(
      req.params.id
    );

    res.status(200).json({
      message: `Industry ${
        industry.isActive ? "activated" : "deactivated"
      }`,
      industry,
    });
  } catch (error) {
    next(error);
  }
};

// Delete Industry
exports.deleteIndustry = async (req, res, next) => {
  try {
    await industryService.deleteIndustry(req.params.id);

    res.status(200).json({
      message: "Industry deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
