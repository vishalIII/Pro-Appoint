const Tenant = require("../../models/Tenant");
exports.getTenantApplications = async (req, res) => {
    try{
        const tenants = await Tenant.find().populate("ownerId", "name email role");
        return tenants;
    }catch(error){
        res.status(500).json({ error: error.message });
    }
}