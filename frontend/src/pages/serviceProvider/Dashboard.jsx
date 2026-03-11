import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import StatusPill from "./components/StatusPill";
import LineTrendChart from "./components/LineTrendChart";
import {
  fetchDashboardSummary,
  fetchRevenueAnalytics,
  fetchResourceUtilization,
  fetchServicePerformance,
  fetchShopApplicationStatus,
  fetchShopById,
  fetchShopResources,
  fetchShopReviewSummary,
  fetchShopReviews,
  fetchShopServices,
  fetchSubscription,
  fetchTenantAppointments,
  runAppointmentAction,
} from "./api/providerApi";
import { useProviderWorkspace } from "./hooks/useProviderWorkspace";
import { useNotifications } from "../../notifications/useNotifications";
import {
  getDateLabel,
  getDateTimeLabel,
  getTodayIsoDate,
  getUtcEndOfDay,
  getUtcStartOfDay,
  getRevenueRangeForPreset,
} from "./utils/dateRange";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));

const getAppointmentActorName = (appointment) => {
  if (appointment?.attendeeId?.name) return appointment.attendeeId.name;
  const fallback = appointment?.attendeeId?._id || appointment?.attendeeId;
  return fallback ? `User #${String(fallback).slice(-6)}` : "Unknown customer";
};

const getServiceName = (appointment) => {
  if (appointment?.serviceId?.name) return appointment.serviceId.name;
  const fallback = appointment?.serviceId?._id || appointment?.serviceId;
  return fallback ? `Service #${String(fallback).slice(-6)}` : "Unknown service";
};

const getResourceSummary = (appointment) => {
  const resources = Array.isArray(appointment?.allocatedResources)
    ? appointment.allocatedResources
    : [];
  if (resources.length === 0) return "N/A";
  return resources
    .map((item) => {
      const name = item?.resourceId?.name || `#${String(item?.resourceId || "").slice(-4)}`;
      return `${name} x${item?.units || 1}`;
    })
    .join(", ");
};

const actionConfig = {
  accept: { label: "Accept" },
  reject: { label: "Reject" },
  complete: { label: "Complete" },
  no_show: { label: "No-show" },
  cancel: { label: "Cancel" },
  "mark-paid": { label: "Mark Paid" },
};

const getAllowedActions = (appointment) => {
  const status = appointment?.status;
  if (status === "pending") {
    return ["accept", "reject", "mark-paid", "cancel"];
  }
  if (status === "confirmed") {
    return ["complete", "mark-paid", "no_show", "cancel"];
  }
  return [];
};

const toChangeClass = (value) => {
  if (value > 0) return "is-positive";
  if (value < 0) return "is-negative";
  return "is-neutral";
};

const filterByShop = (appointments, shopId) => {
  if (!shopId) return appointments;
  return appointments.filter((appointment) => {
    const appointmentShopId = appointment?.shopId?._id || appointment?.shopId;
    return String(appointmentShopId) === String(shopId);
  });
};

const getHealthReport = ({ shop, services, resources, applicationStatus }) => {
  if (!shop) {
    return {
      profileCompletionPct: 0,
      missingItems: [
        "Banner",
        "Description",
        "Services",
        "Resources",
        "Opening hours",
      ],
      approvalStatus: applicationStatus?.status || "unknown",
    };
  }

  const checks = [
    {
      name: "Banner",
      ok: Array.isArray(shop.images) && shop.images.length > 0,
    },
    {
      name: "Description",
      ok: Boolean(String(shop.description || "").trim()),
    },
    {
      name: "Services",
      ok: Array.isArray(services) && services.length > 0,
    },
    {
      name: "Resources",
      ok: Array.isArray(resources) && resources.length > 0,
    },
    {
      name: "Opening hours",
      ok:
        Array.isArray(shop.weeklyAvailability) &&
        shop.weeklyAvailability.some((day) => day?.isOpen || day?.isAvailable),
    },
  ];

  const done = checks.filter((item) => item.ok).length;
  const missingItems = checks.filter((item) => !item.ok).map((item) => item.name);

  return {
    profileCompletionPct: Math.round((done / checks.length) * 100),
    missingItems,
    approvalStatus: applicationStatus?.status || shop.status || "unknown",
  };
};

export default function ProviderDashboard() {
  const { token } = useAuth();
  const { shops, shopsLoading, selectedShopId, effectiveRange, rangePreset } =
    useProviderWorkspace();
  const navigate = useNavigate();
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [runningActionId, setRunningActionId] = useState("");
  const [data, setData] = useState({
    summary: null,
    pendingAppointments: [],
    todayAppointments: [],
    revenue: null,
    servicePerformance: null,
    resourceUtilization: null,
    ratingSummary: null,
    reviews: [],
    shopHealth: null,
    subscription: null,
  });

  const activeShopId = useMemo(
    () => selectedShopId || shops?.[0]?._id || "",
    [selectedShopId, shops],
  );

  const latestNotifications = useMemo(() => {
    const sorted = [...notifications].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
    return sorted.slice(0, 4);
  }, [notifications]);

  const hasUnreadNotifications = notifications.some((notification) => !notification.isRead);

  const handleOpenNotification = useCallback(
    (notification) => {
      if (!notification) return;
      markAsRead(notification._id);
      const route = notification.data?.route || "/tenant/appointments";
      navigate(route);
    },
    [markAsRead, navigate],
  );

  const handleMarkAllRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  const loadDashboard = useCallback(async () => {
    if (!token || shopsLoading) return;

    if (!Array.isArray(shops) || shops.length === 0) {
      setError("");
      setIsLoading(false);
      setData({
        summary: null,
        pendingAppointments: [],
        todayAppointments: [],
        revenue: null,
        servicePerformance: null,
        resourceUtilization: null,
        ratingSummary: null,
        reviews: [],
        shopHealth: null,
        subscription: null,
      });
      return;
    }

    setIsLoading(true);
    setError("");

    const todayIso = getTodayIsoDate();
    const todayFrom = getUtcStartOfDay(`${todayIso}T00:00:00.000Z`).toISOString();
    const todayTo = getUtcEndOfDay(`${todayIso}T00:00:00.000Z`).toISOString();

    try {
      const [
        summaryPayload,
        pendingPayload,
        todayPayload,
        revenuePayload,
        servicePerformancePayload,
        resourceUtilizationPayload,
        subscriptionPayload,
      ] = await Promise.all([
        fetchDashboardSummary({
          token,
          shopId: selectedShopId,
          from: effectiveRange.from,
          to: effectiveRange.to,
        }),
        fetchTenantAppointments({
          token,
          status: "pending",
          from: effectiveRange.from,
          to: effectiveRange.to,
        }),
        fetchTenantAppointments({
          token,
          from: todayFrom,
          to: todayTo,
        }),
        fetchRevenueAnalytics({
          token,
          shopId: selectedShopId,
          range: getRevenueRangeForPreset(rangePreset),
        }),
        fetchServicePerformance({
          token,
          shopId: selectedShopId,
        }),
        fetchResourceUtilization({
          token,
          shopId: selectedShopId,
          date: todayIso,
        }),
        fetchSubscription({
          token,
        }),
      ]);

      const pendingAppointments = filterByShop(
        Array.isArray(pendingPayload?.appointments) ? pendingPayload.appointments : [],
        selectedShopId,
      );
      const todayAppointments = filterByShop(
        Array.isArray(todayPayload?.appointments) ? todayPayload.appointments : [],
        selectedShopId,
      );

      let ratingSummary = null;
      let reviews = [];
      let shopHealth = null;

      if (activeShopId) {
        const [summaryResult, reviewsResult, shopResult, appStatusResult, servicesResult, resourcesResult] =
          await Promise.all([
            fetchShopReviewSummary({ token, shopId: activeShopId }).catch(() => null),
            fetchShopReviews({ token, shopId: activeShopId, page: 1, limit: 3 }).catch(() => null),
            fetchShopById({ token, shopId: activeShopId }).catch(() => null),
            fetchShopApplicationStatus({ token }).catch(() => null),
            fetchShopServices({ token, shopId: activeShopId }).catch(() => null),
            fetchShopResources({ token, shopId: activeShopId }).catch(() => null),
          ]);

        ratingSummary = summaryResult;
        reviews = Array.isArray(reviewsResult?.reviews) ? reviewsResult.reviews : [];

        shopHealth = getHealthReport({
          shop: shopResult,
          services: servicesResult?.services || [],
          resources: resourcesResult?.resources || [],
          applicationStatus: appStatusResult,
        });
      }

      setData({
        summary: summaryPayload,
        pendingAppointments,
        todayAppointments: todayAppointments.sort(
          (left, right) => new Date(left.startTimeUTC) - new Date(right.startTimeUTC),
        ),
        revenue: revenuePayload,
        servicePerformance: servicePerformancePayload,
        resourceUtilization: resourceUtilizationPayload,
        ratingSummary,
        reviews,
        shopHealth,
        subscription: subscriptionPayload,
      });
    } catch (loadError) {
      setError(loadError.message || "Failed to load dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [
    activeShopId,
    effectiveRange.from,
    effectiveRange.to,
    rangePreset,
    selectedShopId,
    shops,
    shopsLoading,
    token,
  ]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const runAction = async ({ appointmentId, action }) => {
    if (!token) return;
    setRunningActionId(`${appointmentId}:${action}`);

    try {
      await runAppointmentAction({
        token,
        appointmentId,
        action,
        body:
          action === "mark-paid"
            ? { paymentMethod: "cash", paymentReference: `manual-${Date.now()}` }
            : undefined,
      });
      await loadDashboard();
    } catch (actionError) {
      setError(actionError.message || "Failed to update appointment");
    } finally {
      setRunningActionId("");
    }
  };

  const summaryCards = useMemo(() => {
    const cards = data.summary?.cards || {};
    return [
      {
        key: "pending",
        label: "Pending",
        value: cards.pending?.value ?? 0,
        change: cards.pending?.changePct ?? 0,
      },
      {
        key: "confirmed",
        label: "Confirmed",
        value: cards.confirmed?.value ?? 0,
        change: cards.confirmed?.changePct ?? 0,
      },
      {
        key: "completed",
        label: "Completed",
        value: cards.completed?.value ?? 0,
        change: cards.completed?.changePct ?? 0,
      },
      {
        key: "cancelled",
        label: "Cancelled",
        value: cards.cancelled?.value ?? 0,
        change: cards.cancelled?.changePct ?? 0,
      },
      {
        key: "noShow",
        label: "No-show",
        value: cards.noShow?.value ?? 0,
        change: cards.noShow?.changePct ?? 0,
      },
      {
        key: "revenue",
        label: "Today Revenue",
        value: formatCurrency(cards.revenue?.value ?? 0),
        change: cards.revenue?.changePct ?? 0,
      },
    ];
  }, [data.summary?.cards]);

  const timelineMeta = useMemo(() => {
    const bookedMinutes = data.todayAppointments.reduce((sum, appointment) => {
      const start = new Date(appointment.startTimeUTC);
      const end = new Date(appointment.endTimeUTC);
      const minutes = Math.max(0, (end - start) / 60000);
      return sum + minutes;
    }, 0);

    const freeMinutes = Math.max(0, 24 * 60 - bookedMinutes);
    return { bookedMinutes, freeMinutes };
  }, [data.todayAppointments]);

  if (!shopsLoading && shops.length === 0) {
    return (
      <section className="provider-dashboard">
        <article className="card">
          <div style={{ textAlign: "center" }}>
            <h2>You don&apos;t have any shop yet.</h2>
            <div className="actions-row" style={{ justifyContent: "center" }}>
              <Link to="/tenant/shops/create" className="btn">
                Create Shop
              </Link>
            </div>
          </div>
        </article>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="provider-dashboard">
        <div className="provider-snapshot-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <article className="provider-snapshot-card is-skeleton" key={index}>
              <div className="provider-skeleton-line" />
              <div className="provider-skeleton-line short" />
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="provider-dashboard">
        <article className="card">
          <h2>Unable to load dashboard</h2>
          <p className="error-text">{error}</p>
          <button type="button" className="btn" onClick={loadDashboard}>
            Retry
          </button>
        </article>
      </section>
    );
  }

  return (
    <section className="provider-dashboard">
      <div className="provider-snapshot-grid">
        {summaryCards.map((card) => (
          <article key={card.key} className={`provider-snapshot-card is-${card.key}`}>
            <p>{card.label}</p>
            <h3>{card.value}</h3>
            <span className={`provider-card-change ${toChangeClass(card.change)}`}>
              {card.change > 0 ? "+" : ""}
              {card.change}%
            </span>
          </article>
        ))}
      </div>

      <article className="card">
        <div className="provider-section-header">
          <h2>Appointment Inbox</h2>
          <Link to="/tenant/appointments">View all</Link>
        </div>
        {data.pendingAppointments.length === 0 ? (
          <p className="muted-text">No pending bookings in selected range.</p>
        ) : (
          <div className="provider-table-wrap">
            <table className="provider-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Date & Time</th>
                  <th>Resource</th>
                  <th>Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.pendingAppointments.slice(0, 8).map((appointment) => (
                  <tr key={appointment._id}>
                    <td>{getAppointmentActorName(appointment)}</td>
                    <td>{getServiceName(appointment)}</td>
                    <td>{getDateTimeLabel(appointment.startTimeUTC)}</td>
                    <td>{getResourceSummary(appointment)}</td>
                    <td>
                      <StatusPill value={appointment.paymentStatus} />
                    </td>
                    <td>
                      <div className="provider-action-row">
                        {getAllowedActions(appointment).map((action) => {
                          const isRunning =
                            runningActionId === `${appointment._id}:${action}`;
                          return (
                            <button
                              key={action}
                              type="button"
                              className="btn btn-small"
                              onClick={() =>
                                runAction({
                                  appointmentId: appointment._id,
                                  action,
                                })
                              }
                              disabled={Boolean(runningActionId)}
                            >
                              {isRunning ? "..." : actionConfig[action]?.label || action}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="card">
        <div className="provider-section-header">
          <h2>Today Timeline</h2>
          <p className="muted-text">
            Booked: {timelineMeta.bookedMinutes} mins | Free (estimated): {timelineMeta.freeMinutes} mins
          </p>
        </div>
        {data.todayAppointments.length === 0 ? (
          <p className="muted-text">No bookings for today.</p>
        ) : (
          <div className="provider-timeline">
            {data.todayAppointments.map((appointment) => (
              <div className="provider-timeline-item" key={appointment._id}>
                <div>
                  <strong>{getDateTimeLabel(appointment.startTimeUTC)}</strong>
                  <p className="muted-text">{getServiceName(appointment)}</p>
                </div>
                <div>
                  <StatusPill value={appointment.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </article>

      {/* <article className="card provider-notifications-card">
        <div className="provider-section-header">
          <h2>Recent Notifications</h2>
          <div className="provider-section-header-actions">
            <Link to="/tenant/notifications" className="muted-link">
              View all
            </Link>
            {notifications.length > 0 ? (
              <button
                type="button"
                className="btn btn-small"
                onClick={handleMarkAllRead}
                disabled={!hasUnreadNotifications}
              >
                Mark all read
              </button>
            ) : null}
          </div>
        </div>
        {latestNotifications.length === 0 ? (
          <p className="muted-text">No notifications yet.</p>
        ) : (
          <div className="provider-notification-list">
            {latestNotifications.map((notification) => {
              const startLabel =
                notification.data?.appointmentStart || new Date(notification.createdAt).toLocaleString();
              return (
                <article
                  key={notification._id}
                  className={`provider-notification-card${notification.isRead ? "" : " is-unread"}`}
                  onClick={() => handleOpenNotification(notification)}
                >
                  <div className="provider-notification-left">
                    <span className="provider-notification-meta">{startLabel}</span>
                    <p className="provider-notification-title">{notification.title}</p>
                    <p className="provider-notification-message">{notification.message}</p>
                    <p className="provider-notification-detail">
                      <strong>Service:</strong> {notification.data?.serviceName || "Service"}
                    </p>
                    <p className="provider-notification-detail">
                      <strong>Customer:</strong> {notification.data?.customerName || "Customer"}
                    </p>
                  </div>
                  <div className="provider-notification-right">
                    <StatusPill value={notification.data?.status || notification.type} />
                    {notification.data?.route ? (
                      <button
                        type="button"
                        className="btn btn-small"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpenNotification(notification);
                        }}
                      >
                        View
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </article> */}

      <div className="provider-two-col">
        <article className="card">
          <h2>Revenue & Payments</h2>
          <div className="provider-kpi-grid">
            <div>
              <p>Net Revenue</p>
              <strong>{formatCurrency(data.revenue?.totals?.netRevenue || 0)}</strong>
            </div>
            <div>
              <p>Paid</p>
              <strong>{formatCurrency(data.revenue?.totals?.paid || 0)}</strong>
            </div>
            <div>
              <p>Pending</p>
              <strong>{formatCurrency(data.revenue?.totals?.pending || 0)}</strong>
            </div>
            <div>
              <p>Refunded</p>
              <strong>{formatCurrency(data.revenue?.totals?.refunded || 0)}</strong>
            </div>
          </div>
          <LineTrendChart data={data.revenue?.trend || []} />
        </article>

        <article className="card">
          <h2>Service Performance</h2>
          {data.servicePerformance?.services?.length ? (
            <div className="provider-table-wrap">
              <table className="provider-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Bookings</th>
                    <th>Completion %</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.servicePerformance.services.slice(0, 6).map((service) => (
                    <tr key={service.serviceId}>
                      <td>{service.serviceName}</td>
                      <td>{service.bookings}</td>
                      <td>{service.completionPct}%</td>
                      <td>{formatCurrency(service.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted-text">No service analytics yet.</p>
          )}
          {data.servicePerformance?.topService ? (
            <p className="muted-text">
              Top service: <strong>{data.servicePerformance.topService.serviceName}</strong>
            </p>
          ) : null}
        </article>
      </div>

      <div className="provider-two-col">
        <article className="card">
          <h2>Resource Utilization</h2>
          {data.resourceUtilization?.resources?.length ? (
            <div className="provider-table-wrap">
              <table className="provider-table">
                <thead>
                  <tr>
                    <th>Resource</th>
                    <th>Bookings</th>
                    <th>Utilization</th>
                    <th>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {data.resourceUtilization.resources.slice(0, 8).map((resource) => (
                    <tr key={resource.resourceId}>
                      <td>{resource.name}</td>
                      <td>{resource.totalBookings}</td>
                      <td>{resource.utilizationPercent}%</td>
                      <td>{resource.overbookRisk ? "High" : "Normal"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted-text">No active resources found.</p>
          )}
        </article>

        <article className="card">
          <h2>Ratings</h2>
          <p>
            Average: <strong>{data.ratingSummary?.ratingAvg ?? 0}</strong>
          </p>
          <p>
            Total reviews: <strong>{data.ratingSummary?.ratingCount ?? 0}</strong>
          </p>
          {data.reviews.length > 0 ? (
            <div className="provider-review-list">
              {data.reviews.map((review) => (
                <article key={review._id} className="provider-review-item">
                  <div>
                    <strong>{review.reviewerId?.name || "Customer"}</strong>
                    <p className="muted-text">{review.comment || "No comment"}</p>
                  </div>
                  <StatusPill value={`${review.rating} / 5`} />
                </article>
              ))}
            </div>
          ) : (
            <p className="muted-text">No reviews yet.</p>
          )}
        </article>
      </div>

      <div className="provider-two-col">
        <article className="card">
          <h2>Shop Health</h2>
          <p>
            Approval status: <strong>{data.shopHealth?.approvalStatus || "N/A"}</strong>
          </p>
          <p>
            Profile completion: <strong>{data.shopHealth?.profileCompletionPct || 0}%</strong>
          </p>
          <div className="provider-missing-list">
            {(data.shopHealth?.missingItems || []).map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </article>

        <article className="card">
          <h2>Subscription</h2>
          <p>
            Plan: <strong>{data.subscription?.plan || "N/A"}</strong>
          </p>
          <p>
            Expires on: <strong>{getDateLabel(data.subscription?.subscriptionEnd)}</strong>
          </p>
          <p>
            Shop usage:{" "}
            <strong>
              {data.subscription?.usage?.approvedShops || 0}/
              {data.subscription?.limits?.maxShops ?? "-"}
            </strong>
          </p>
          <Link className="btn" to="/payment/subscription">
            Upgrade plan
          </Link>
        </article>
      </div>

      <article className="card">
        <h2>Smart Alerts</h2>
        {data.summary?.alerts?.length ? (
          <div className="provider-alert-list">
            {data.summary.alerts.map((alert) => (
              <div className={`provider-alert-item is-${alert.severity}`} key={alert.code}>
                <h3>{alert.title}</h3>
                <p>{alert.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted-text">No active alerts.</p>
        )}
      </article>
    </section>
  );
}
