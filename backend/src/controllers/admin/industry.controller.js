const industryService = require("../../services/admin/industry.service");

exports.createIndustry = async (req, res) => {
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

exports.getAllIndustries = async (req, res) => {
  try {
    const industries = await industryService.getAllIndustries()

    res.status(200).json({ industries });
  } catch (error) {
    next(error);
  }
};

exports.updateIndustry = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;
    const industry = await industryService.updateIndustry(id, name, isActive);

    res.status(200).json({
      message: "Industry updated successfully",
      industry
    });
  } catch (error) {
    next(error);
  }
};

exports.toggleIndustryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const industry = await industryService.toggleIndustryStatus(id)

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

exports.deleteIndustry = async (req, res) => {
  try {
    const { id } = req.params;
    const industry = await industryService.deleteIndustry(id)

    res.status(200).json({ message: "Industry deleted successfully" });
  } catch (error) {
    next(error);
  }
};
