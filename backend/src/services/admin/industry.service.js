const Industry = require("../../models/service/industry/industry.model");

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
