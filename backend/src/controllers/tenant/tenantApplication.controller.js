const Tenant = require("../../models/tenant/tenant.model")
const User = require("../../models/user/user.model")

// Post - apply for service provider
exports.applyProvider = async (req, res) => {
  try {
    const userId = req.user.userId;

    //fetching user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    //if already user is provider
    if (user.role === "ServiceProvider") {
      return res.status(400).json({ message: "Already a service provider" });
    }

    //if service provider is already exist | we can say already applied
    const existingTenant = await Tenant.findOne({ ownerId: userId })
    if (existingTenant) {
      return res.status(400).json({ message: "Service provider application already exists" })
    }

    //now creating tenant but since tenant is getting created first time we will keep status pending
    const tenant = Tenant.create({ ownerId: userId, ...req.body })

    return res.status(201).json({
      message: "Service provider application submitted successfully",
      tenantId: tenant._id,
      status: tenant.status,
    })

  } catch (error) {
      console.log(error)
      return res.status(500).json({message:"Server Error"})
  }
};

// Get service provider application status ------------------------------------------------------------
exports.getApplicationStatus = async(req,res)=>{
  try {
      const tenant = await Tenant.findOne({ownerId:req.user.userId})
      if(!tenant){
        return res.status(404).json({message:"No service provider application is found"})
      }

      return res.status(200).json({
        status:tenant.status,
        reason:tenant.statusMeta?.reason || null,
        updatedAt:tenant.statusMeta?.at || null,
      })

  } catch (error) {
    console.error(error)
    return res.status(500).json({message:"Server Error"})
  }
};