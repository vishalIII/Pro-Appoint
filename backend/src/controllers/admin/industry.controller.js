const Industry = require("../../models/service/industry/industry.model");
const industryService = require("../../services/admin/industry.service");
/**
 * Create Industry
 * POST /api/admin/industries
 */
exports.createIndustry = async (req, res) => {
  try {
    const { name } = req.body;
    const industry = await industryService.createIndustry(name);

    res.status(201).json({
      message: "Industry created successfully",
      industry,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get All Industries
 * GET /api/admin/industries
 */
exports.getAllIndustries = async (req, res) => {
  try {
    const industries = await industryService.getAllIndustries()

    res.status(200).json({ industries });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Industry
 * PATCH /api/admin/industries/:id
 */
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

/**
 * Toggle Industry Status (Active / Inactive)
 * PATCH /api/admin/industries/:id/toggle
 */
exports.toggleIndustryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const industry = await industryService.toggleIndustryStatus(id)

    res.status(200).json({
      message: `Industry ${industry.isActive ? "activated" : "deactivated"}`,
      industry,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Industry (hard delete – optional)
 * DELETE /api/admin/industries/:id
 */
exports.deleteIndustry = async (req, res) => {
  try {
    const { id } = req.params;
    const industry = await industryService.deleteIndustry(id)

    res.status(200).json({ message: "Industry deleted successfully" });
  } catch (error) {
    next(error);
  }
};
