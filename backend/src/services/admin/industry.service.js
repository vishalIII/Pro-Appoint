const Industry = require("../../models/service/industry/industry.model");
exports.createIndustry = async (req, res) => {
    try{
         const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Industry name is required" });
    }

    const existing = await Industry.findOne({ name: name.toLowerCase() });
    if (existing) {                 
      return res.status(409).json({ message: "Industry already exists" });
    }

    const industry = await Industry.create({ name });
    return industry;
    }catch(error){
        res.status(500).json({ message: error.message });
    }
}
exports.getAllIndustries = async (req, res) => {
    try{
        const industries = await Industry.find().sort({ createdAt: 1 });
        return industries;
    }catch(error){
        res.status(500).json({ message: error.message });
    }
}
exports.updateIndustry = async (req, res) => {
    try{
        const { id } = req.params;
            const { name, isActive } = req.body;
        
            const industry = await Industry.findById(id);
            if (!industry) {
              return res.status(404).json({ message: "Industry not found" });
            }
        
            if (name) industry.name = name;
            if (typeof isActive === "boolean") industry.isActive = isActive;
        
            await industry.save();
            return industry;
    }catch(error){
        res.status(500).json({ message: error.message });
    }
}
exports.toggleIndustryStatus = async (req, res) => {
    try{
             const { id } = req.params;
            
                const industry = await Industry.findById(id);
                if (!industry) {
                  return res.status(404).json({ message: "Industry not found" });
                }
            
                industry.isActive = !industry.isActive;
                await industry.save();
                return industry;
    }catch(error){
        res.status(500).json({ message: error.message });
    }
}
exports.deleteIndustry = async (req, res) => {
    try{
         const { id } = req.params;

    const industry = await Industry.findByIdAndDelete(id);
    if (!industry) {
      return res.status(404).json({ message: "Industry not found" });
    }
    return industry;
    }catch(error){
        res.status(500).json({ message: error.message });
    }
}