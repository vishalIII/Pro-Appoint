require("dotenv").config();
const mongoose = require("mongoose");

const Service = require("../src/models/service/service.model");
const Resource = require("../src/models/resource/resource.model");

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in environment");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const resourceResult = await Resource.updateMany(
    { type: "instructor" },
    { $set: { type: "staff" } },
  );

  const services = await Service.find({
    "requiredResources.type": "instructor",
  });

  let updatedServiceCount = 0;
  for (const service of services) {
    let changed = false;
    service.requiredResources = (service.requiredResources || []).map((item) => {
      if (item?.type === "instructor") {
        changed = true;
        return {
          ...item.toObject(),
          type: "staff",
        };
      }
      return item;
    });

    if (changed) {
      await service.save();
      updatedServiceCount += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        updatedResources: resourceResult.modifiedCount || 0,
        updatedServices: updatedServiceCount,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("Migration failed:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
