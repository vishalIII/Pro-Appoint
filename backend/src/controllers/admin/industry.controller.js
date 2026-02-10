const industryService = require("../../services/admin/industry.service");

exports.createIndustry = async (req, res) => {
  try {
    const industry = await industryService.createIndustry(req.body.name);

    res.status(201).json({
      message: "Industry created successfully",
      industry,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message,
    });
  }
};

exports.getAllIndustries = async (req, res) => {
  try {
    const industries = await industryService.getAllIndustries();
    res.status(200).json({ industries });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateIndustry = async (req, res) => {
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
    res.status(error.statusCode || 500).json({
      message: error.message,
    });
  }
};

exports.toggleIndustryStatus = async (req, res) => {
  try {
    const industry = await industryService.toggleIndustryStatus(req.params.id);

    res.status(200).json({
      message: `Industry ${
        industry.isActive ? "activated" : "deactivated"
      }`,
      industry,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message,
    });
  }
};

exports.deleteIndustry = async (req, res) => {
  try {
    await industryService.deleteIndustry(req.params.id);
    res.status(200).json({ message: "Industry deleted successfully" });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message,
    });
  }
};
