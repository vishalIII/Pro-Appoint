const Tenant = require("../../models/tenant/tenant.model");
const AppError = require("../../utils/appError");
exports.getTenantApplications = async () => {
    try {
        const tenants = await Tenant.find().populate("ownerId", "name email role");
        return tenants;
    } catch (error) {
        throw new AppError(error.message || "Failed to fetch tenant applications",error.statusCode || 500);
    }
}