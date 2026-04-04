import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import StatusPill from "./components/StatusPill";
import {
  fetchTenantAppointments,
  runAppointmentAction,
  endMeeting,
} from "./api/providerApi";
import { useProviderWorkspace } from "./hooks/useProviderWorkspace";
import { getDateTimeLabel } from "./utils/dateRange";
import RefreshButton from "../../components/RefreshButton";
import { useNavigate } from "react-router-dom";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No-show" },
];

const PAGE_SIZE = 10;

const ACTIONS_BY_STATUS = {
  pending: ["accept", "reject", "cancel", "mark-paid"],
  confirmed: ["complete", "no-show", "cancel", "mark-paid"],
};

const actionLabel = (value) => {
  if (value === "mark-paid") return "Mark Paid";
  if (value === "no-show") return "No-show";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const getCustomerName = (appointment) => {
  if (appointment?.attendeeId?.name) return appointment.attendeeId.name;
  const raw = appointment?.attendeeId?._id || appointment?.attendeeId;
  return raw ? `User #${String(raw).slice(-6)}` : "Unknown";
};

const getServiceName = (appointment) => {
  if (appointment?.serviceId?.name) return appointment.serviceId.name;
  const raw = appointment?.serviceId?._id || appointment?.serviceId;
  return raw ? `Service #${String(raw).slice(-6)}` : "Unknown";
};

const getAttendeeCount = (appointment) => {
  if (Array.isArray(appointment?.attendees)) return appointment.attendees.length;
  return appointment?.attendeeId ? 1 : 0;
};

const getCapacity = (appointment) => {
  return (
    appointment?.capacitySnapshot ||
    appointment?.serviceId?.onlineCapacity ||
    appointment?.serviceId?.capacity ||
    1
  );
};

const meetingStatusLabel = (status) => {
  if (!status) return "Waiting";
  if (status === "live") return "Live";
  if (status === "ended") return "Ended";
  return "Waiting";
};

export default function ProviderAppointmentsPage() {
  const { token } = useAuth();
  const { selectedShopId, effectiveRange } = useProviderWorkspace();
  const navigate = useNavigate();

  const [status, setStatus] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [runningActionId, setRunningActionId] = useState("");
  const [expandedAttendees, setExpandedAttendees] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const loadAppointments = useCallback(async (pageToLoad = 1) => {
    if (!token) return;

    setIsLoading(true);
    setError("");

    try {
      const payload = await fetchTenantAppointments({
        token,
        status,
        from: effectiveRange.from,
        to: effectiveRange.to,
        page: pageToLoad,
        limit: PAGE_SIZE,
        shopId: selectedShopId,
      });

      const list = Array.isArray(payload?.appointments) ? payload.appointments : [];

      setAppointments(list);
      setTotalPages(payload?.totalPages || 1);
      setTotalCount(payload?.total ?? list.length);
      setPage(payload?.page || pageToLoad);
    } catch (err) {
      setError(err.message || "Failed to load appointments");
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  }, [token, status, selectedShopId, effectiveRange.from, effectiveRange.to]);

  useEffect(() => {
    loadAppointments(1);
  }, [loadAppointments, status, selectedShopId, effectiveRange.from, effectiveRange.to]);

  const onAction = async (appointmentId, action) => {
    if (!token) return;

    setRunningActionId(`${appointmentId}:${action}`);
    setError("");

    try {
      await runAppointmentAction({
        token,
        appointmentId,
        action,
        body:
          action === "mark-paid"
            ? {
              paymentMethod: "cash",
              paymentReference: `manual-${Date.now()}`,
            }
            : undefined,
      });

      await loadAppointments(page);
    } catch (err) {
      setError(err.message || "Failed to update appointment");
    } finally {
      setRunningActionId("");
    }
  };

  const handleJoinMeeting = (appointment) => {
    navigate(`/meeting/${appointment._id}`);
  };

  const handleEndMeeting = async (appointmentId) => {
    if (!token) return;

    try {
      await endMeeting({ token, appointmentId });
      await loadAppointments(page);
    } catch (err) {
      setError(err.message || "Failed to end meeting");
    }
  };

  const toggleAttendees = (appointmentId) => {
    setExpandedAttendees((prev) => ({
      ...prev,
      [appointmentId]: !prev[appointmentId],
    }));
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    loadAppointments(nextPage);
  };

  const paginationItems = useMemo(() => {
    const items = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i += 1) items.push(i);
      return items;
    }

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    items.push(1);
    if (start > 2) items.push("ellipsis-start");
    for (let i = start; i <= end; i += 1) items.push(i);
    if (end < totalPages - 1) items.push("ellipsis-end");
    items.push(totalPages);
    return items;
  }, [page, totalPages]);


  return (
    <section className="provider-page">
      <article className="card">
        <div className="provider-section-header">
          <h1>Appointments</h1>

          <label className="form-field provider-compact-field">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <RefreshButton
              onRefresh={() => loadAppointments(page)}
              disabled={isLoading}
            />
          </label>
        </div>

        {isLoading && <p>Loading appointments...</p>}
        {error && <p className="error-text">{error}</p>}

        {!isLoading && !error && appointments.length === 0 && (
          <p className="muted-text">No appointments in selected range.</p>
        )}

        {!isLoading && !error && appointments.length > 0 && (
          <div className="provider-table-wrap">
            <table className="provider-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Start</th>
                  <th>Attendees</th>
                  <th>Meeting</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {appointments.map((appointment) => {
                  const actions =
                    ACTIONS_BY_STATUS[appointment.status] || [];

                  const attendeeCount = getAttendeeCount(appointment);
                  const capacity = getCapacity(appointment);
                  const meetingPillValue =
                    appointment.mode === "online"
                      ? appointment.meeting?.status || "waiting"
                      : "offline";
                  const meetingStatusRaw = appointment.meeting?.status;

                  const buttonLabel =
                    meetingStatusRaw === "live" ? "Join" : "Start";

                  const meetingStatus =
                    appointment.mode === "online"
                      ? appointment.meeting
                        ? meetingStatusLabel(appointment.meeting.status)
                        : "Not created"
                      : "Offline";

                  const isOnlineConfirmed =
                    appointment.mode === "online" &&
                    appointment.status === "confirmed" &&
                    appointment.meeting?.roomId;

                  return (
                    <React.Fragment key={appointment._id}>
                      <tr>
                        <td>{getCustomerName(appointment)}</td>

                        <td>{getServiceName(appointment)}</td>

                        <td>
                          {getDateTimeLabel(
                            appointment.startTimeUTC
                          )}
                        </td>

                        <td>
                          {attendeeCount}/{capacity}
                          {appointment.isGroup && (
                            <span
                              className="badge badge-info"
                              style={{ marginLeft: 6 }}
                            >
                              Group
                            </span>
                          )}
                        </td>

                        <td>
                          {appointment.mode === "online" ? (
                            <>
                              <StatusPill value={meetingPillValue} />
                              <div className="muted-text">
                                {meetingStatus}
                              </div>
                            </>
                          ) : (
                            <span className="muted-text">
                              Offline
                            </span>
                          )}
                        </td>

                        <td>
                          <StatusPill value={appointment.status} />
                        </td>

                        <td>
                          <StatusPill
                            value={appointment.paymentStatus}
                          />
                        </td>

                        <td>
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              flexWrap: "wrap",
                            }}
                          >
                            {isOnlineConfirmed && (
                              <>
                                <button
                                  className="btn btn-small"
                                  onClick={() =>
                                    handleJoinMeeting(appointment)
                                  }
                                >
                                  {buttonLabel}
                                </button>

                                <button
                                  className="btn btn-ghost"
                                  onClick={() =>
                                    toggleAttendees(
                                      appointment._id
                                    )
                                  }
                                >
                                  View Attendees
                                </button>

                                {appointment.meeting?.status ===
                                  "live" && (
                                    <button
                                      className="btn btn-small btn-danger"
                                      onClick={() =>
                                        handleEndMeeting(
                                          appointment._id
                                        )
                                      }
                                    >
                                      End Meeting
                                    </button>
                                  )}
                              </>
                            )}

                            {actions.map((action) => {
                              const isRunning =
                                runningActionId ===
                                `${appointment._id}:${action}`;

                              return (
                                <button
                                  key={action}
                                  className="btn btn-small"
                                  onClick={() =>
                                    onAction(
                                      appointment._id,
                                      action
                                    )
                                  }
                                  disabled={isRunning}
                                >
                                  {isRunning
                                    ? "..."
                                    : actionLabel(action)}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>

                      {expandedAttendees[appointment._id] && (
                        <tr>
                          <td colSpan={8}>
                            <strong>Attendees:</strong>{" "}
                            {appointment.attendees?.length ? (
                              appointment.attendees.map((a) => (
                                <span
                                  key={a.userId?._id || a.userId}
                                  style={{ marginRight: 12 }}
                                >
                                  {a.userId?.name ||
                                    a.userId?.email ||
                                    `User #${String(
                                      a.userId
                                    ).slice(-6)}`}
                                </span>
                              ))
                            ) : (
                              <span className="muted-text">
                                No attendees yet
                              </span>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!error && totalCount > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 12,
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div className="muted-text">
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, totalCount)}–
              {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
            </div>

            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1 || isLoading}
              >
                &lt; Prev
              </button>
              {paginationItems.map((item, idx) =>
                typeof item === "number" ? (
                  <button
                    key={item}
                    type="button"
                    className={`btn btn-small${item === page ? " btn-primary" : " btn-ghost"}`}
                    onClick={() => handlePageChange(item)}
                    disabled={isLoading}
                  >
                    {item}
                  </button>
                ) : (
                  <span key={item + idx} className="muted-text">
                    ...
                  </span>
                )
              )}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages || isLoading}
              >
                Next &gt;
              </button>
            </div>
          </div>
        )}
      </article>
    </section>
  );
}
