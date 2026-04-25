import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import api from "../../auth/api";
import { formatTimeWindowInTimezone, getDetectedTimezone } from "../../utils/timezone";

const PAGE_SIZE = 6;

export default function MyBookings() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const detectedTimezone = getDetectedTimezone();

  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelingId, setCancelingId] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const loadBookings = useCallback(
    async (pageToLoad = 1) => {
      if (!token) {
        setBookings([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const { data } = await api.get("/customer/appointments", {
          params: { page: pageToLoad, limit: PAGE_SIZE },
        });

        setBookings(Array.isArray(data?.appointments) ? data.appointments : []);
        setPage(data?.page || pageToLoad);
        setTotalPages(data?.totalPages || 1);
        setTotalCount(data?.total ?? (data?.appointments?.length || 0));
      } catch (err) {
        setError(err.message || "Failed to load bookings");
      } finally {
        setIsLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleCancel = async (appointmentId) => {
    setCancelingId(appointmentId);
    setError("");

    try {
      await api.delete(`/customer/appointments/${appointmentId}`);
      setBookings((prev) => prev.filter((item) => item._id !== appointmentId));
    } catch (err) {
      setError(err.message || "Failed to cancel booking");
    } finally {
      setCancelingId("");
    }
  };

  const handleJoin = (appointment) => {
    navigate(`/meeting/${appointment._id}`);
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    loadBookings(nextPage);
  };

  const paginationItems = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) paginationItems.push(i);
  } else {
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    paginationItems.push(1);
    if (start > 2) paginationItems.push("ellipsis-start");
    for (let i = start; i <= end; i++) paginationItems.push(i);
    if (end < totalPages - 1) paginationItems.push("ellipsis-end");
    paginationItems.push(totalPages);
  }

  return (
    <section className="page-block">
      <div className="card">
        <div className="page-title-row">
          <h1>My Bookings</h1>
          <Link to="/menu">Book New Service</Link>
        </div>

        {isLoading ? <p>Loading bookings...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {!isLoading && !error && bookings.length === 0 ? <p>No bookings yet.</p> : null}

        {!isLoading && !error && bookings.length > 0 ? (
          <div className="service-grid">
            {bookings.map((booking) => {
              const providerTimezone = booking.providerTimezone || "UTC";

              return (
                <article key={booking._id} className="service-card">
                  <h3>Booking #{booking._id?.slice(-6)}</h3>

                  <p>
                    <strong>Status:</strong>{" "}
                    <span className="status-badge">{booking.status}</span>
                  </p>

                  {booking.mode === "online" ? (
                    <p>
                      <strong>Meeting:</strong>{" "}
                      <span className="status-badge">
                        {booking.meeting?.status || "waiting"}
                      </span>
                    </p>
                  ) : null}

                  <p>
                    <strong>Provider time:</strong>{" "}
                    {formatTimeWindowInTimezone({
                      startTimeUTC: booking.startTimeUTC,
                      endTimeUTC: booking.endTimeUTC,
                      timezone: providerTimezone,
                    })}{" "}
                    ({providerTimezone})
                  </p>

                  <p>
                    <strong>Your time:</strong>{" "}
                    {formatTimeWindowInTimezone({
                      startTimeUTC: booking.startTimeUTC,
                      endTimeUTC: booking.endTimeUTC,
                      timezone: detectedTimezone,
                    })}{" "}
                    ({detectedTimezone})
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

                  {booking.mode === "online" && booking.status === "confirmed" ? (
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={() => handleJoin(booking)}
                      style={{ marginTop: 8 }}
                    >
                      Join Meeting
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}

        {!error && totalCount > 0 ? (
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
                ),
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
        ) : null}
      </div>
    </section>
  );
}