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
    const industries = await Industry.find().sort({ createdAt: 1 });

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
    const { id } = req.params;
    const { name, isActive } = req.body;

    const industry = await Industry.findById(id);
    if (!industry) {
      return res.status(404).json({ message: "Industry not found" });
    }

    if (name) industry.name = name;
    if (typeof isActive === "boolean") industry.isActive = isActive;

    await industry.save();

    res.status(200).json({
      message: "Industry updated successfully",
      industry,
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
    const { id } = req.params;

    const industry = await Industry.findById(id);
    if (!industry) {
      return res.status(404).json({ message: "Industry not found" });
    }

    industry.isActive = !industry.isActive;
    await industry.save();

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
    const { id } = req.params;

    const industry = await Industry.findByIdAndDelete(id);
    if (!industry) {
      return res.status(404).json({ message: "Industry not found" });
    }

    res.status(200).json({ message: "Industry deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
