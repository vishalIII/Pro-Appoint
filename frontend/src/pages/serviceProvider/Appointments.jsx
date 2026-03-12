import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import StatusPill from "./components/StatusPill";
import {
  fetchJoinCredentials,
  fetchTenantAppointments,
  runAppointmentAction,
  endMeeting,
} from "./api/providerApi";
import { useProviderWorkspace } from "./hooks/useProviderWorkspace";
import { getDateTimeLabel } from "./utils/dateRange";
import RefreshButton from "../../components/RefreshButton"

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No-show" },
];


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
  if (Array.isArray(appointment?.attendees)) {
    return appointment.attendees.length;
  }
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
  const [status, setStatus] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [runningActionId, setRunningActionId] = useState("");
  const [joiningId, setJoiningId] = useState("");
  const [joinInfo, setJoinInfo] = useState(null);
  const [expandedAttendees, setExpandedAttendees] = useState({});

  const loadAppointments = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setError("");

    try {
      const payload = await fetchTenantAppointments({
        token,
        status,
        from: effectiveRange.from,
        to: effectiveRange.to,
      });
      const list = Array.isArray(payload?.appointments) ? payload.appointments : [];
      const filtered = selectedShopId
        ? list.filter((item) => {
          const shopId = item?.shopId?._id || item?.shopId;
          return String(shopId) === String(selectedShopId);
        })
        : list;
      setAppointments(filtered);
    } catch (loadError) {
      setError(loadError.message || "Failed to load appointments");
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveRange.from, effectiveRange.to, selectedShopId, status, token]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

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
            ? { paymentMethod: "cash", paymentReference: `manual-${Date.now()}` }
            : undefined,
      });
      await loadAppointments();
    } catch (actionError) {
      setError(actionError.message || "Failed to update appointment");
    } finally {
      setRunningActionId("");
    }
  };

  const handleJoinMeeting = async (appointment) => {
    if (!token) return;
    setJoiningId(appointment._id);
    setError("");
    try {
      const payload = await fetchJoinCredentials({
        token,
        appointmentId: appointment._id,
      });
      setJoinInfo({
        appointmentId: appointment._id,
        roomId: payload.roomId,
        token: payload.token,
        appId: payload.appID || payload.appId,
        role: payload.role,
        meetingStatus: payload.meetingStatus,
        expireAt: payload.expireAt,
      });
    } catch (joinError) {
      setError(joinError.message || "Failed to join meeting");
    } finally {
      setJoiningId("");
    }
  };

  const handleEndMeeting = async (appointmentId) => {
    if (!token) return;
    setJoiningId(appointmentId);
    setError("");
    try {
      await endMeeting({ token, appointmentId });
      await loadAppointments();
    } catch (endError) {
      setError(endError.message || "Failed to end meeting");
    } finally {
      setJoiningId("");
    }
  };

  const toggleAttendees = (appointmentId) => {
    setExpandedAttendees((prev) => ({
      ...prev,
      [appointmentId]: !prev[appointmentId],
    }));
  };

  return (
    <section className="provider-page">
      <article className="card">
        <div className="provider-section-header">
          <h1>Appointments</h1>
          <label className="form-field provider-compact-field" htmlFor="provider-appointment-status">
            Status
            <select
              id="provider-appointment-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <RefreshButton onRefresh={loadAppointments} disabled={isLoading} />
          </label>
        </div>

        {isLoading ? <p>Loading appointments...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!isLoading && !error && appointments.length === 0 ? (
          <p className="muted-text">No appointments in selected range.</p>
        ) : null}

        {!isLoading && !error && appointments.length > 0 ? (
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
                  const actions = ACTIONS_BY_STATUS[appointment.status] || [];
                  const attendeeCount = getAttendeeCount(appointment);
                  const capacity = getCapacity(appointment);
                  const meetingStatus =
                    appointment.mode === "online"
                      ? meetingStatusLabel(appointment.meeting?.status)
                      : "Offline";
                  const isOnlineConfirmed =
                    appointment.mode === "online" &&
                    appointment.status === "confirmed";
                  return (
                    <React.Fragment key={appointment._id}>
                      <tr>
                        <td>{getCustomerName(appointment)}</td>
                        <td>{getServiceName(appointment)}</td>
                        <td>{getDateTimeLabel(appointment.startTimeUTC)}</td>
                        <td>
                          {attendeeCount}/{capacity}
                          {appointment.isGroup ? (
                            <span className="badge badge-info" style={{ marginLeft: 6 }}>
                              Group
                            </span>
                          ) : null}
                        </td>
                        <td>
                          {appointment.mode === "online" ? (
                            <div className="meeting-cell">
                              <StatusPill value={meetingStatus.toLowerCase()} />
                              <div className="muted-text">
                                {meetingStatus}
                                {appointment.meeting?.startedAt
                                  ? ` · since ${getDateTimeLabel(appointment.meeting.startedAt)}`
                                  : ""}
                              </div>
                            </div>
                          ) : (
                            <span className="muted-text">Offline</span>
                          )}
                        </td>
                        <td
                          title={
                            appointment?.status === "cancelled"
                              ? appointment?.cancellation?.reason
                              : ""
                          }
                        >
                          <StatusPill value={appointment.status} />
                        </td>

                        <td>
                          <StatusPill value={appointment.paymentStatus} />
                        </td>
                        <td>
                          <div className="provider-action-row" style={{ gap: "6px", flexWrap: "wrap" }}>
                            {isOnlineConfirmed ? (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-small"
                                  onClick={() => handleJoinMeeting(appointment)}
                                  disabled={joiningId === appointment._id}
                                >
                                  {joiningId === appointment._id ? "Joining..." : "Start / Join"}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-ghost"
                                  onClick={() => toggleAttendees(appointment._id)}
                                >
                                  View Attendees
                                </button>
                                {appointment.meeting?.status === "live" ? (
                                  <button
                                    type="button"
                                    className="btn btn-small btn-danger"
                                    onClick={() => handleEndMeeting(appointment._id)}
                                    disabled={joiningId === appointment._id}
                                  >
                                    End Meeting
                                  </button>
                                ) : null}
                              </>
                            ) : null}

                            {actions.length === 0 ? (
                              <span className="muted-text">No actions</span>
                            ) : (
                              actions.map((action) => {
                                const isPaid = appointment.paymentStatus === "paid";
                                const isInvalidAction =
                                  (appointment.status === "completed" && action === "complete") ||
                                  (appointment.status === "cancelled" && action === "cancel") ||
                                  (appointment.status === "no_show" && action === "no-show") ||
                                  (action === "mark-paid" && isPaid);

                                const isRunning = runningActionId === `${appointment._id}:${action}`;

                                return (
                                  <button
                                    key={action}
                                    type="button"
                                    className="btn btn-small"
                                    onClick={() => onAction(appointment._id, action)}
                                    disabled={
                                      isInvalidAction ||
                                      isRunning ||
                                      Boolean(runningActionId) ||
                                      joiningId === appointment._id
                                    }
                                    title={isInvalidAction ? "Action not allowed for current status" : ""}
                                  >
                                    {isRunning ? "..." : actionLabel(action)}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedAttendees[appointment._id] ? (
                        <tr>
                          <td colSpan={8}>
                            <strong>Attendees:</strong>{" "}
                            {Array.isArray(appointment.attendees) && appointment.attendees.length > 0 ? (
                              appointment.attendees.map((a) => (
                                <span key={a.userId?._id || a.userId} style={{ marginRight: 12 }}>
                                  {a.userId?.name || a.userId?.email || `User #${String(a.userId).slice(-6)}`}
                                </span>
                              ))
                            ) : (
                              <span className="muted-text">No attendees yet</span>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {joinInfo ? (
          <div className="muted-panel" style={{ marginTop: 16 }}>
            <p>
              <strong>Join details ready for appointment #{joinInfo.appointmentId?.slice(-6)}:</strong>
            </p>
            <p>Room ID: <code>{joinInfo.roomId}</code></p>
            <p>Role: {joinInfo.role || "attendee"} | App ID: {joinInfo.appId}</p>
            <p className="muted-text">
              Token (keep private): <code style={{ wordBreak: "break-all" }}>{joinInfo.token}</code>
            </p>
          </div>
        ) : null}
      </article>
    </section>
  );
}
