const Industry = require("../../models/service/industry/industry.model");
const industryService = require("../../services/admin/industry.service");
/**
 * Create Industry
 * POST /api/admin/industries
 */
exports.createIndustry = async (req, res) => {
  try {
    const industry=await industryService.createIndustry(req,res)

    res.status(201).json({
      message: "Industry created successfully",
      industry,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get All Industries
 * GET /api/admin/industries
 */
exports.getAllIndustries = async (req, res) => {
  try {
    const industries = await industryService.getAllIndustries(req,res)

    res.status(200).json({ industries });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update Industry
 * PATCH /api/admin/industries/:id
 */
exports.updateIndustry = async (req, res) => {
  try {
    const industry = await industryService.updateIndustry(req,res)

    res.status(200).json({
      message: "Industry updated successfully",
      industry
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Toggle Industry Status (Active / Inactive)
 * PATCH /api/admin/industries/:id/toggle
 */
exports.toggleIndustryStatus = async (req, res) => {
  try {
    const industry = await industryService.toggleIndustryStatus(req,res)

    res.status(200).json({
      message: `Industry ${industry.isActive ? "activated" : "deactivated"}`,
      industry,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete Industry (hard delete – optional)
 * DELETE /api/admin/industries/:id
 */
exports.deleteIndustry = async (req, res) => {
  try {
   const industry = await industryService.deleteIndustry(req,res)

    res.status(200).json({ message: "Industry deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
