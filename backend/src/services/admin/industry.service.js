const Industry = require("../../models/service/industry/industry.model");
<<<<<<< HEAD
const AppError = require("../../utils/appError");
exports.createIndustry = async (name) => {
    try {
        

        if (!name) {
            throw new AppError("Industry name is required", 400);
        }

        const existing = await Industry.findOne({ name: name.toLowerCase() });
        if (existing) {
            throw new AppError("Industry with this name already exists", 400);
        }

        const industry = await Industry.create({ name });
        return industry;
    } catch (error) {
        throw new AppError(error.message, error.statusCode || 500);
    }
}
exports.getAllIndustries = async () => {
    try {
        const industries = await Industry.find().sort({ createdAt: 1 });
        return industries;
    } catch (error) {
        throw new AppError(error.message, error.statusCode || 500);
    }
}
exports.updateIndustry = async (id, name, isActive) => {
    try {
        

        const industry = await Industry.findById(id);
        if (!industry) {
            throw new AppError("Industry not found", 404);
        }

        if (name) industry.name = name;
        if (typeof isActive === "boolean") industry.isActive = isActive;

        await industry.save();
        return industry;
    } catch (error) {
        throw new AppError(error.message, error.statusCode || 500);
    }
}
exports.toggleIndustryStatus = async () => {
    try {
        

        const industry = await Industry.findById(id);
        if (!industry) {
            throw new AppError("Industry not found", 404);
        }

        industry.isActive = !industry.isActive;
        await industry.save();
        return industry;
    } catch (error) {
        throw new AppError(error.message, error.statusCode || 500);
    }
}
exports.deleteIndustry = async (id) => {
    try {
        

        const industry = await Industry.findByIdAndDelete(id);
        if (!industry) {
            throw new AppError("Industry not found", 404);
        }
        return industry;
    } catch (error) {
        throw new AppError(error.message, error.statusCode || 500);
    }
}
=======

exports.createIndustry = async (name) => {
  if (!name) {
    throw new Error("Industry name is required");
  }

  const existing = await Industry.findOne({
    name: name.toLowerCase(),
  });

  if (existing) {
    const error = new Error("Industry already exists");
    error.statusCode = 409;
    throw error;
  }

  return await Industry.create({ name });
};

exports.getAllIndustries = async () => {
  return await Industry.find().sort({ createdAt: 1 });
};

exports.updateIndustry = async (id, data) => {
  const industry = await Industry.findById(id);

  if (!industry) {
    const error = new Error("Industry not found");
    error.statusCode = 404;
    throw error;
  }

  if (data.name) industry.name = data.name;
  if (typeof data.isActive === "boolean") {
    industry.isActive = data.isActive;
  }

  await industry.save();
  return industry;
};

exports.toggleIndustryStatus = async (id) => {
  const industry = await Industry.findById(id);

  if (!industry) {
    const error = new Error("Industry not found");
    error.statusCode = 404;
    throw error;
  }

  industry.isActive = !industry.isActive;
  await industry.save();

  return industry;
};

exports.deleteIndustry = async (id) => {
  const industry = await Industry.findByIdAndDelete(id);

  if (!industry) {
    const error = new Error("Industry not found");
    error.statusCode = 404;
    throw error;
  }

  return industry;
};
>>>>>>> b6ca8348e9276c1a321316beb50610bf63320967
