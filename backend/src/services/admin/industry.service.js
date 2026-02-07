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