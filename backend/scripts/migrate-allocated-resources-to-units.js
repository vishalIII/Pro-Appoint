require("dotenv").config();
const mongoose = require("mongoose");

const parseAllocatedResourceEntries = (allocatedResources = []) => {
  const counts = new Map();

  for (const item of allocatedResources) {
    if (item === null || item === undefined) continue;

    if (
      typeof item === "string" ||
      item instanceof mongoose.Types.ObjectId ||
      item?._bsontype === "ObjectId"
    ) {
      const key = String(item);
      counts.set(key, (counts.get(key) || 0) + 1);
      continue;
    }

    if (typeof item === "object" && item.resourceId) {
      const key = String(item.resourceId);
      const rawUnits = Number(item.units);
      const units =
        Number.isFinite(rawUnits) && rawUnits > 0
          ? Math.floor(rawUnits)
          : 1;
      counts.set(key, (counts.get(key) || 0) + units);
    }
  }

  return [...counts.entries()].map(([resourceId, units]) => ({
    resourceId: new mongoose.Types.ObjectId(resourceId),
    units,
  }));
};

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in environment");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const collection = mongoose.connection.collection("appointments");
  const cursor = collection.find(
    { allocatedResources: { $exists: true, $type: "array", $ne: [] } },
    { projection: { allocatedResources: 1 } },
  );

  let scanned = 0;
  let updated = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    scanned += 1;

    const normalized = parseAllocatedResourceEntries(
      doc.allocatedResources || [],
    );

    if (normalized.length === 0) continue;

    const alreadyNormalized =
      Array.isArray(doc.allocatedResources) &&
      doc.allocatedResources.length === normalized.length &&
      doc.allocatedResources.every((item, idx) => {
        if (!item || typeof item !== "object" || !item.resourceId) {
          return false;
        }
        return (
          String(item.resourceId) === String(normalized[idx].resourceId) &&
          Number(item.units) === Number(normalized[idx].units)
        );
      });

    if (alreadyNormalized) continue;

    await collection.updateOne(
      { _id: doc._id },
      { $set: { allocatedResources: normalized } },
    );
    updated += 1;
  }

  console.log(
    JSON.stringify(
      {
        scannedAppointments: scanned,
        updatedAppointments: updated,
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
