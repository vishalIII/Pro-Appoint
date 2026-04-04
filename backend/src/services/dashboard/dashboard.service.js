const mongoose = require("mongoose");
const Appointment = require("../../models/appointment/appointment.model");
const Shop = require("../../models/shop/shop.model");
const Service = require("../../models/service/service.model");
const Resource = require("../../models/resource/resource.model");
const Tenant = require("../../models/tenant/tenant.model");
const AppError = require("../../utils/appError");

const CURRENCY = "INR";
const CANCELLED_STATUSES = ["cancelled", "cancelled_late"];
const REFUND_STATUSES = ["refunded", "partially_refunded"];
const PAID_LIKE_STATUSES = ["paid", "partially_refunded", "refunded"];
const PENDING_PAYMENT_STATUSES = ["pending", "unpaid"];

const asObjectId = (value, fieldName) => {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }
  return new mongoose.Types.ObjectId(value);
};

const startOfDayUTC = (date) =>
  new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );

const endOfDayUTC = (date) =>
  new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );

const parseDate = (value, fieldName) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }
  return parsed;
};

const resolveSummaryRange = ({ from, to }) => {
  if (!from && !to) {
    const now = new Date();
    return {
      fromDate: startOfDayUTC(now),
      toDate: endOfDayUTC(now),
    };
  }

  if (from && to) {
    const fromDate = parseDate(from, "from");
    const toDate = parseDate(to, "to");
    if (fromDate > toDate) {
      throw new AppError("from must be before to", 400);
    }
    return { fromDate, toDate };
  }

  if (from) {
    const fromDate = parseDate(from, "from");
    return {
      fromDate,
      toDate: endOfDayUTC(fromDate),
    };
  }

  const toDate = parseDate(to, "to");
  return {
    fromDate: startOfDayUTC(toDate),
    toDate,
  };
};

const toRounded = (value) => Number((value || 0).toFixed(2));

const getPercentageChange = (current, previous) => {
  if (!previous) {
    return current ? 100 : 0;
  }
  return Number((((current - previous) / previous) * 100).toFixed(2));
};

const resolveShopScope = async ({ tenantIdObjectId, shopId }) => {
  if (!shopId) return null;

  const shopObjectId = asObjectId(shopId, "shopId");
  const shop = await Shop.findOne({
    _id: shopObjectId,
    tenantId: tenantIdObjectId,
  })
    .select("_id")
    .lean();

  if (!shop) {
    throw new AppError("Unauthorized shop access", 403);
  }

  return shopObjectId;
};

const buildAppointmentMatch = ({
  tenantIdObjectId,
  shopObjectId,
  fromDate,
  toDate,
}) => {
  const match = {
    tenantId: tenantIdObjectId,
    startTimeUTC: {
      $gte: fromDate,
      $lte: toDate,
    },
  };

  if (shopObjectId) {
    match.shopId = shopObjectId;
  }

  return match;
};

const aggregateSummary = async ({ match }) => {
  const [summary] = await Appointment.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        pending: {
          $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
        },
        confirmed: {
          $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] },
        },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        cancelled: {
          $sum: {
            $cond: [{ $in: ["$status", CANCELLED_STATUSES] }, 1, 0],
          },
        },
        noShow: {
          $sum: { $cond: [{ $eq: ["$status", "no_show"] }, 1, 0] },
        },
        paidRevenue: {
          $sum: {
            $cond: [{ $in: ["$paymentStatus", PAID_LIKE_STATUSES] }, "$price", 0],
          },
        },
        refundedAmount: {
          $sum: {
            $cond: [
              { $in: ["$paymentStatus", REFUND_STATUSES] },
              { $ifNull: ["$refund.amount", 0] },
              0,
            ],
          },
        },
        pendingAmount: {
          $sum: {
            $cond: [{ $in: ["$paymentStatus", PENDING_PAYMENT_STATUSES] }, "$price", 0],
          },
        },
        failedAmount: {
          $sum: {
            $cond: [{ $eq: ["$paymentStatus", "failed"] }, "$price", 0],
          },
        },
      },
    },
  ]);

  const pending = summary?.pending || 0;
  const confirmed = summary?.confirmed || 0;
  const completed = summary?.completed || 0;
  const cancelled = summary?.cancelled || 0;
  const noShow = summary?.noShow || 0;
  const paidRevenue = toRounded(summary?.paidRevenue || 0);
  const refundedAmount = toRounded(summary?.refundedAmount || 0);
  const pendingAmount = toRounded(summary?.pendingAmount || 0);
  const failedAmount = toRounded(summary?.failedAmount || 0);
  const netRevenue = toRounded(paidRevenue - refundedAmount);

  return {
    counts: {
      pending,
      confirmed,
      completed,
      cancelled,
      noShow,
    },
    revenue: {
      currency: CURRENCY,
      netRevenue,
      paidRevenue,
      refundedAmount,
      pendingAmount,
      failedAmount,
    },
  };
};

const computeResourceMetrics = ({ resources, appointments }) => {
  const resourceMetricsById = new Map(
    resources.map((resource) => [
      String(resource._id),
      {
        resourceId: resource._id,
        name: resource.name,
        type: resource.type,
        capacity: Number(resource.capacity) || 1,
        totalBookings: 0,
        totalUnitsBooked: 0,
        peakConcurrentUnits: 0,
        utilizationPercent: 0,
        overbookRisk: false,
        idleAlert: true,
        events: [],
      },
    ]),
  );

  for (const appointment of appointments) {
    const allocations = Array.isArray(appointment.allocatedResources)
      ? appointment.allocatedResources
      : [];
    const seenResources = new Set();

    for (const allocation of allocations) {
      const resourceId = String(allocation.resourceId || "");
      if (!resourceMetricsById.has(resourceId)) continue;

      const units = Number(allocation.units) || 0;
      if (units <= 0) continue;

      const metric = resourceMetricsById.get(resourceId);
      metric.totalUnitsBooked += units;
      metric.events.push({
        time: new Date(appointment.startTimeUTC),
        delta: units,
      });
      metric.events.push({
        time: new Date(appointment.endTimeUTC),
        delta: -units,
      });

      if (!seenResources.has(resourceId)) {
        metric.totalBookings += 1;
        seenResources.add(resourceId);
      }
    }
  }

  const resourceRows = [];
  for (const metric of resourceMetricsById.values()) {
    metric.events.sort((left, right) => {
      if (left.time.getTime() !== right.time.getTime()) {
        return left.time - right.time;
      }
      return left.delta - right.delta;
    });

    let activeUnits = 0;
    let peak = 0;
    for (const event of metric.events) {
      activeUnits += event.delta;
      if (activeUnits > peak) peak = activeUnits;
    }

    metric.peakConcurrentUnits = peak;
    metric.utilizationPercent = metric.capacity
      ? Math.round((peak / metric.capacity) * 100)
      : 0;
    metric.overbookRisk =
      peak > metric.capacity || metric.utilizationPercent >= 90;
    metric.idleAlert = metric.totalBookings === 0;

    resourceRows.push({
      resourceId: metric.resourceId,
      name: metric.name,
      type: metric.type,
      capacity: metric.capacity,
      totalBookings: metric.totalBookings,
      totalUnitsBooked: metric.totalUnitsBooked,
      peakConcurrentUnits: metric.peakConcurrentUnits,
      utilizationPercent: metric.utilizationPercent,
      overbookRisk: metric.overbookRisk,
      idleAlert: metric.idleAlert,
    });
  }

  resourceRows.sort((left, right) => right.utilizationPercent - left.utilizationPercent);

  const totalResources = resourceRows.length;
  const overbookedCount = resourceRows.filter((item) => item.overbookRisk).length;
  const idleCount = resourceRows.filter((item) => item.idleAlert).length;
  const avgUtilization = totalResources
    ? Math.round(
        resourceRows.reduce((sum, item) => sum + item.utilizationPercent, 0) /
          totalResources,
      )
    : 0;

  return {
    summary: {
      totalResources,
      overbookedCount,
      idleCount,
      avgUtilization,
    },
    resources: resourceRows,
  };
};

const getResourceUtilizationInternal = async ({
  tenantIdObjectId,
  shopObjectId,
  date,
  includeCompleted = true,
}) => {
  const selectedDate = date ? parseDate(date, "date") : new Date();
  const dayStart = startOfDayUTC(selectedDate);
  const dayEnd = endOfDayUTC(selectedDate);

  const resourceQuery = {
    tenantId: tenantIdObjectId,
    isActive: true,
  };

  if (shopObjectId) {
    resourceQuery.shopId = shopObjectId;
  }

  const resources = await Resource.find(resourceQuery)
    .select("_id name type capacity")
    .lean();

  if (resources.length === 0) {
    return {
      date: dayStart.toISOString(),
      summary: {
        totalResources: 0,
        overbookedCount: 0,
        idleCount: 0,
        avgUtilization: 0,
      },
      resources: [],
    };
  }

  const consideredStatuses = includeCompleted
    ? ["pending", "confirmed", "completed", "no_show"]
    : ["pending", "confirmed"];

  const appointmentQuery = {
    tenantId: tenantIdObjectId,
    status: { $in: consideredStatuses },
    startTimeUTC: { $lt: dayEnd },
    endTimeUTC: { $gt: dayStart },
  };

  if (shopObjectId) {
    appointmentQuery.shopId = shopObjectId;
  }

  const appointments = await Appointment.find(appointmentQuery)
    .select("startTimeUTC endTimeUTC allocatedResources")
    .lean();

  const utilization = computeResourceMetrics({
    resources,
    appointments,
  });

  return {
    date: dayStart.toISOString(),
    summary: utilization.summary,
    resources: utilization.resources,
  };
};

const buildSmartAlerts = async ({ tenantIdObjectId, shopObjectId }) => {
  const alerts = [];
  const now = new Date();
  const pendingStaleBefore = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const pendingQuery = {
    tenantId: tenantIdObjectId,
    status: "pending",
    createdAt: { $lte: pendingStaleBefore },
  };
  if (shopObjectId) pendingQuery.shopId = shopObjectId;

  const stalePendingCount = await Appointment.countDocuments(pendingQuery);
  if (stalePendingCount > 0) {
    alerts.push({
      code: "pending_overdue",
      severity: "high",
      title: "Pending bookings require action",
      message: `${stalePendingCount} booking(s) are pending for more than 2 hours.`,
    });
  }

  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowUtilization = await getResourceUtilizationInternal({
    tenantIdObjectId,
    shopObjectId,
    date: tomorrow,
    includeCompleted: false,
  });

  const tomorrowOverbooked = tomorrowUtilization.resources.filter(
    (resource) => resource.overbookRisk,
  );

  if (tomorrowOverbooked.length > 0) {
    alerts.push({
      code: "resource_overbook_risk",
      severity: "high",
      title: "Resource overbook risk tomorrow",
      message: `${tomorrowOverbooked.length} resource(s) are near or above capacity tomorrow.`,
    });
  }

  const tenant = await Tenant.findById(tenantIdObjectId)
    .select("plan planStatus subscriptionEnd")
    .lean();

  if (tenant?.subscriptionEnd) {
    const msDiff = new Date(tenant.subscriptionEnd).getTime() - now.getTime();
    const daysLeft = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

    if (daysLeft <= 5) {
      alerts.push({
        code: "subscription_expiring",
        severity: daysLeft <= 0 ? "high" : "medium",
        title: "Subscription expiring soon",
        message:
          daysLeft <= 0
            ? "Your subscription has expired. Renew to avoid booking disruption."
            : `Your ${tenant.plan} plan expires in ${daysLeft} day(s).`,
      });
    }
  }

  const serviceQuery = shopObjectId
    ? { shopId: shopObjectId, isActive: true }
    : {
        shopId: {
          $in: await Shop.distinct("_id", { tenantId: tenantIdObjectId }),
        },
        isActive: true,
      };
  const activeServiceCount = await Service.countDocuments(serviceQuery);

  if (activeServiceCount === 0) {
    alerts.push({
      code: "no_active_services",
      severity: "medium",
      title: "No active services",
      message: "Activate at least one service to continue accepting bookings.",
    });
  }

  const lowRatingShops = await Shop.find({
    tenantId: tenantIdObjectId,
    status: "approved",
    ratingCount: { $gte: 5 },
    ratingAvg: { $lt: 3.5 },
    ...(shopObjectId ? { _id: shopObjectId } : {}),
  })
    .select("shopName ratingAvg")
    .limit(3)
    .lean();

  if (lowRatingShops.length > 0) {
    alerts.push({
      code: "low_shop_rating",
      severity: "medium",
      title: "Low rating detected",
      message: `${lowRatingShops.length} shop(s) are below 3.5 rating. Review feedback and improve quality.`,
    });
  }

  return alerts;
};

exports.getDashboardSummary = async ({ tenantId, shopId, from, to }) => {
  try {
    const tenantIdObjectId = asObjectId(tenantId, "tenantId");
    const shopObjectId = await resolveShopScope({
      tenantIdObjectId,
      shopId,
    });
    const { fromDate, toDate } = resolveSummaryRange({ from, to });

    const durationMs = toDate.getTime() - fromDate.getTime();
    const previousToDate = new Date(fromDate.getTime() - 1);
    const previousFromDate = new Date(previousToDate.getTime() - durationMs);

    const [currentSummary, previousSummary, alerts] = await Promise.all([
      aggregateSummary({
        match: buildAppointmentMatch({
          tenantIdObjectId,
          shopObjectId,
          fromDate,
          toDate,
        }),
      }),
      aggregateSummary({
        match: buildAppointmentMatch({
          tenantIdObjectId,
          shopObjectId,
          fromDate: previousFromDate,
          toDate: previousToDate,
        }),
      }),
      buildSmartAlerts({
        tenantIdObjectId,
        shopObjectId,
      }),
    ]);

    const cards = {
      pending: {
        value: currentSummary.counts.pending,
        changePct: getPercentageChange(
          currentSummary.counts.pending,
          previousSummary.counts.pending,
        ),
      },
      confirmed: {
        value: currentSummary.counts.confirmed,
        changePct: getPercentageChange(
          currentSummary.counts.confirmed,
          previousSummary.counts.confirmed,
        ),
      },
      completed: {
        value: currentSummary.counts.completed,
        changePct: getPercentageChange(
          currentSummary.counts.completed,
          previousSummary.counts.completed,
        ),
      },
      cancelled: {
        value: currentSummary.counts.cancelled,
        changePct: getPercentageChange(
          currentSummary.counts.cancelled,
          previousSummary.counts.cancelled,
        ),
      },
      noShow: {
        value: currentSummary.counts.noShow,
        changePct: getPercentageChange(
          currentSummary.counts.noShow,
          previousSummary.counts.noShow,
        ),
      },
      revenue: {
        value: currentSummary.revenue.netRevenue,
        changePct: getPercentageChange(
          currentSummary.revenue.netRevenue,
          previousSummary.revenue.netRevenue,
        ),
        currency: CURRENCY,
      },
    };

    return {
      range: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        previousFrom: previousFromDate.toISOString(),
        previousTo: previousToDate.toISOString(),
      },
      cards,
      revenueBreakdown: currentSummary.revenue,
      alerts,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to load dashboard summary", 500);
  }
};

const resolveRevenueWindow = (range) => {
  const now = new Date();
  const today = startOfDayUTC(now);

  switch (range) {
    case "day":
      return {
        range,
        fromDate: today,
        toDate: endOfDayUTC(now),
        bucket: "hour",
        bucketCount: 24,
      };
    case "month":
      return {
        range,
        fromDate: new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000),
        toDate: endOfDayUTC(now),
        bucket: "day",
        bucketCount: 30,
      };
    case "week":
    default:
      return {
        range: range === "week" ? range : "week",
        fromDate: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
        toDate: endOfDayUTC(now),
        bucket: "day",
        bucketCount: 7,
      };
  }
};

const buildBucketKeys = ({ fromDate, bucket, bucketCount }) => {
  const buckets = [];
  for (let index = 0; index < bucketCount; index += 1) {
    const date = new Date(fromDate.getTime());
    if (bucket === "hour") {
      date.setUTCHours(fromDate.getUTCHours() + index);
      const label = `${String(date.getUTCHours()).padStart(2, "0")}:00`;
      const key = `${date.toISOString().slice(0, 13)}:00`;
      buckets.push({ key, label });
    } else {
      date.setUTCDate(fromDate.getUTCDate() + index);
      const label = date.toISOString().slice(5, 10);
      const key = date.toISOString().slice(0, 10);
      buckets.push({ key, label });
    }
  }
  return buckets;
};

exports.getRevenueAnalytics = async ({ tenantId, shopId, range }) => {
  try {
    const tenantIdObjectId = asObjectId(tenantId, "tenantId");
    const shopObjectId = await resolveShopScope({
      tenantIdObjectId,
      shopId,
    });

    const window = resolveRevenueWindow(range);
    const match = buildAppointmentMatch({
      tenantIdObjectId,
      shopObjectId,
      fromDate: window.fromDate,
      toDate: window.toDate,
    });

    const bucketExpression =
      window.bucket === "hour"
        ? {
            $dateToString: {
              format: "%Y-%m-%dT%H:00",
              date: "$startTimeUTC",
              timezone: "UTC",
            },
          }
        : {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$startTimeUTC",
              timezone: "UTC",
            },
          };

    const [totals, trendData] = await Promise.all([
      Appointment.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            paid: {
              $sum: {
                $cond: [{ $in: ["$paymentStatus", PAID_LIKE_STATUSES] }, "$price", 0],
              },
            },
            refunded: {
              $sum: {
                $cond: [
                  { $in: ["$paymentStatus", REFUND_STATUSES] },
                  { $ifNull: ["$refund.amount", 0] },
                  0,
                ],
              },
            },
            pending: {
              $sum: {
                $cond: [{ $in: ["$paymentStatus", PENDING_PAYMENT_STATUSES] }, "$price", 0],
              },
            },
            failed: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "failed"] }, "$price", 0],
              },
            },
          },
        },
      ]),
      Appointment.aggregate([
        { $match: match },
        {
          $group: {
            _id: bucketExpression,
            paid: {
              $sum: {
                $cond: [{ $in: ["$paymentStatus", PAID_LIKE_STATUSES] }, "$price", 0],
              },
            },
            refunded: {
              $sum: {
                $cond: [
                  { $in: ["$paymentStatus", REFUND_STATUSES] },
                  { $ifNull: ["$refund.amount", 0] },
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const totalsRow = totals[0] || {};
    const paid = toRounded(totalsRow.paid || 0);
    const refunded = toRounded(totalsRow.refunded || 0);
    const pending = toRounded(totalsRow.pending || 0);
    const failed = toRounded(totalsRow.failed || 0);
    const netRevenue = toRounded(paid - refunded);

    const trendByKey = new Map(
      trendData.map((row) => [
        row._id,
        {
          paid: toRounded(row.paid || 0),
          refunded: toRounded(row.refunded || 0),
        },
      ]),
    );

    const buckets = buildBucketKeys({
      fromDate: window.fromDate,
      bucket: window.bucket,
      bucketCount: window.bucketCount,
    });

    const trend = buckets.map((bucket) => {
      const row = trendByKey.get(bucket.key) || { paid: 0, refunded: 0 };
      return {
        label: bucket.label,
        revenue: toRounded(row.paid - row.refunded),
      };
    });

    return {
      range: window.range,
      from: window.fromDate.toISOString(),
      to: window.toDate.toISOString(),
      currency: CURRENCY,
      totals: {
        netRevenue,
        paid,
        pending,
        refunded,
        failed,
      },
      trend,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(error.message || "Failed to load revenue analytics", 500);
  }
};

exports.getServicePerformance = async ({ tenantId, shopId }) => {
  try {
    const tenantIdObjectId = asObjectId(tenantId, "tenantId");
    const shopObjectId = await resolveShopScope({
      tenantIdObjectId,
      shopId,
    });

    const shopQuery = {
      tenantId: tenantIdObjectId,
    };
    if (shopObjectId) {
      shopQuery._id = shopObjectId;
    }

    const shops = await Shop.find(shopQuery).select("_id shopName").lean();
    const shopIds = shops.map((shop) => shop._id);

    if (shopIds.length === 0) {
      return {
        services: [],
        topService: null,
        lowPerformance: [],
        generatedAt: new Date().toISOString(),
      };
    }

    const [services, appointmentStats] = await Promise.all([
      Service.find({
        shopId: { $in: shopIds },
        isActive: true,
      })
        .select("_id name shopId")
        .lean(),
      Appointment.aggregate([
        {
          $match: {
            tenantId: tenantIdObjectId,
            ...(shopObjectId ? { shopId: shopObjectId } : {}),
          },
        },
        {
          $group: {
            _id: "$serviceId",
            bookings: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
            cancelled: {
              $sum: { $cond: [{ $in: ["$status", CANCELLED_STATUSES] }, 1, 0] },
            },
            noShow: {
              $sum: { $cond: [{ $eq: ["$status", "no_show"] }, 1, 0] },
            },
            paidRevenue: {
              $sum: {
                $cond: [{ $in: ["$paymentStatus", PAID_LIKE_STATUSES] }, "$price", 0],
              },
            },
            refundedAmount: {
              $sum: {
                $cond: [
                  { $in: ["$paymentStatus", REFUND_STATUSES] },
                  { $ifNull: ["$refund.amount", 0] },
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const statsByServiceId = new Map(
      appointmentStats.map((row) => [String(row._id), row]),
    );

    const shopNameById = new Map(shops.map((shop) => [String(shop._id), shop.shopName]));

    const serviceRows = services.map((service) => {
      const stats = statsByServiceId.get(String(service._id));
      const bookings = stats?.bookings || 0;
      const completed = stats?.completed || 0;
      const cancelled = stats?.cancelled || 0;
      const noShow = stats?.noShow || 0;
      const paidRevenue = toRounded(stats?.paidRevenue || 0);
      const refundedAmount = toRounded(stats?.refundedAmount || 0);
      const revenue = toRounded(paidRevenue - refundedAmount);
      const completionPct = bookings
        ? Number(((completed / bookings) * 100).toFixed(2))
        : 0;

      return {
        serviceId: service._id,
        serviceName: service.name,
        shopId: service.shopId,
        shopName: shopNameById.get(String(service.shopId)) || "Unknown shop",
        bookings,
        completed,
        cancelled,
        noShow,
        completionPct,
        revenue,
      };
    });

    serviceRows.sort((left, right) => {
      if (right.bookings !== left.bookings) return right.bookings - left.bookings;
      return right.revenue - left.revenue;
    });

    const topService = serviceRows.length > 0 ? serviceRows[0] : null;
    const lowPerformance = serviceRows
      .filter(
        (row) =>
          row.bookings >= 3 && (row.completionPct < 60 || row.noShow / row.bookings > 0.2),
      )
      .sort((left, right) => left.completionPct - right.completionPct)
      .slice(0, 5);

    return {
      services: serviceRows,
      topService,
      lowPerformance,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error.message || "Failed to load service performance analytics",
      500,
    );
  }
};

exports.getResourceUtilization = async ({ tenantId, shopId, date }) => {
  try {
    const tenantIdObjectId = asObjectId(tenantId, "tenantId");
    const shopObjectId = await resolveShopScope({
      tenantIdObjectId,
      shopId,
    });

    return getResourceUtilizationInternal({
      tenantIdObjectId,
      shopObjectId,
      date,
      includeCompleted: true,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error.message || "Failed to load resource utilization analytics",
      500,
    );
  }
};
