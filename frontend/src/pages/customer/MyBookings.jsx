import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const parseJsonSafely = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return response.json();
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
};

export default function MyBookings() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelingId, setCancelingId] = useState("");

  const loadBookings = useCallback(async () => {
    if (!token) {
      setBookings([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/customer/appointments`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const payload = await parseJsonSafely(response);

      if (!response.ok) {
        throw new Error(payload?.message || "Failed to load bookings");
      }

      setBookings(Array.isArray(payload?.appointments) ? payload.appointments : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleCancel = async (appointmentId) => {
    setCancelingId(appointmentId);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/customer/appointments/${appointmentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const payload = await parseJsonSafely(response);

      if (!response.ok) {
        throw new Error(payload?.message || "Failed to cancel booking");
      }

      setBookings((prev) => prev.filter((item) => item._id !== appointmentId));
    } catch (cancelError) {
      setError(cancelError.message || "Failed to cancel booking");
    } finally {
      setCancelingId("");
    }
  };

  return (
    <section className="page-block">
      <div className="card">
        <div className="page-title-row">
          <h1>My Bookings</h1>
          <Link to="/menu">Book New Service</Link>
        </div>

        {isLoading ? <p>Loading bookings...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!isLoading && !error && bookings.length === 0 ? (
          <p>No bookings yet.</p>
        ) : null}

        {!isLoading && !error && bookings.length > 0 ? (
          <div className="service-grid">
            {bookings.map((booking) => (
              <article key={booking._id} className="service-card">
                <h3>Booking #{booking._id?.slice(-6)}</h3>
                <p>
                  <strong>Status:</strong> <span className="status-badge">{booking.status}</span>
                </p>
                <p>
                  <strong>Start:</strong> {formatDateTime(booking.startTimeUTC)}
                </p>
                <p>
                  <strong>End:</strong> {formatDateTime(booking.endTimeUTC)}
                </p>
                <p>
                  <strong>Mode:</strong> {booking.mode}
                </p>
                <p>
                  <strong>Price:</strong> INR {booking.price ?? "N/A"}
                </p>

                {booking.status === "pending" || booking.status === "confirmed" ? (
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => handleCancel(booking._id)}
                    disabled={cancelingId === booking._id}
                  >
                    {cancelingId === booking._id ? "Cancelling..." : "Cancel Booking"}
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
