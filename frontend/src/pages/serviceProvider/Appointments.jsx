import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import StatusPill from "./components/StatusPill";
import { fetchTenantAppointments, runAppointmentAction } from "./api/providerApi";
import { useProviderWorkspace } from "./hooks/useProviderWorkspace";
import { getDateTimeLabel } from "./utils/dateRange";
import {RefreshButton} from "../../components/RefreshButton"

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

export default function ProviderAppointmentsPage() {
  const { token } = useAuth();
  const { selectedShopId, effectiveRange } = useProviderWorkspace();
  const [status, setStatus] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [runningActionId, setRunningActionId] = useState("");

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
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => {

                  const actions = ACTIONS_BY_STATUS[appointment.status] || [];
                  return (
                    <tr key={appointment._id}>
                      <td>{getCustomerName(appointment)}</td>
                      <td>{getServiceName(appointment)}</td>
                      <td>{getDateTimeLabel(appointment.startTimeUTC)}</td>



                      {/* <StatusPill value={appointment.status} /> */}

                      {/* <td>
                        <div
                          title={appointment?.cancellation?.reason || ""}
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                        >
                          <StatusPill value={appointment.status} />

                          {appointment?.cancellation?.reason?.includes("Auto-cancelled") && (
                            <span className="badge badge-warning">Auto</span>
                          )}
                        </div>
                      </td> */}

                      <td title={appointment?.status === "cancelled" ? appointment?.cancellation?.reason : ""}>
                        <StatusPill value={appointment.status} />
                      </td>



                      <td>
                        <StatusPill value={appointment.paymentStatus} />
                      </td>
                      <td>
                        <div className="provider-action-row">
                          {actions.length === 0 ? (
                            <span className="muted-text">No actions</span>
                          ) : (
                            actions.map((action) => {
                              // Disable if:
                              // 1. Another action is running
                              // 2. The current action is running
                              // 3. Action is no longer valid for status
                              // 4. Special case: mark-paid already done
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
                                  disabled={isInvalidAction || isRunning || Boolean(runningActionId)}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </article>
    </section>
  );
}
