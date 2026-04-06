const Industry = require("../../models/service/industry/industry.model");
const AppError = require("../../utils/appError");
exports.createIndustry = async (name) => {
    try {
        if (!name) {
            throw new AppError("Industry name is required", 400);
        }

        const existing = await Industry.findOne({
            name: name.toLowerCase(),
        });

        if (existing) {
            throw new AppError("Industry with this name already exists", 409);
        }

        return await Industry.create({ name });
    } catch (error) {
        throw new AppError(error.message || "Failed to create industry", error.statusCode || 500);
    }
};

exports.getAllIndustries = async () => {
    try {
        return await Industry.find().sort({ createdAt: 1 });
    } catch (error) { throw new AppError(error.message || "Failed to fetch industries", error.statusCode || 500); }
};

exports.updateIndustry = async (id, data) => {
    const { name, isActive } = data || {};
    try{
    const industry = await Industry.findById(id);

    if (!industry) {
        throw new AppError("Industry not found", 404);
    }

    if (name) industry.name = name;
    if (typeof isActive === "boolean") {
        industry.isActive = isActive;
    }

    await industry.save();
    return industry;
}catch(error){
    throw new AppError(error.message || "Failed to update industry", error.statusCode || 500);
}
};

exports.toggleIndustryStatus = async (id) => {
    try{
    const industry = await Industry.findById(id);

    if (!industry) {
        throw new AppError("Industry not found", 404);
    }

    industry.isActive = !industry.isActive;
    await industry.save();

    return industry;
}catch(error){
    throw new AppError(error.message || "Failed to toggle industry status", error.statusCode || 500);
}
};

exports.deleteIndustry = async (id) => {
    try{
    const industry = await Industry.findByIdAndDelete(id);

    if (!industry) {
        throw new AppError("Industry not found", 404);
    }

    return industry;
}catch(error){
    throw new AppError(error.message || "Failed to delete industry", error.statusCode || 500);
}
};
