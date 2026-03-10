import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../../auth/useAuth";
import { ROLES } from "../../../rbac";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const WEEK_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday"
};

const parseJsonSafely = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return response.json();
};

const formatTime = (value) => {
  if (typeof value !== "string") return "";
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return value;
  }

  const period = hours >= 12 ? "pm" : "am";
  const twelveHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelveHour}:${String(minutes).padStart(2, "0")}${period}`;
};

const formatDayAvailability = (daySchedule) => {
  if (!daySchedule?.isOpen) return "Closed";
  if (!Array.isArray(daySchedule?.slots) || daySchedule.slots.length === 0) return "Open";

  return daySchedule.slots
    .map((slot) => {
      const start = formatTime(slot?.startTime ?? slot?.start);
      const end = formatTime(slot?.endTime ?? slot?.end);
      if (!start || !end) return null;
      return `${start} - ${end}`;
    })
    .filter(Boolean)
    .join(", ");
};

const todayIndex = (new Date().getDay() + 6) % 7;
const todayKey = WEEK_DAYS[todayIndex];

export default function ServiceDetails() {
  const { shopId, serviceId } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [service, setService] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchServiceDetails = async () => {
      if (!shopId || !serviceId) return;
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_BASE_URL}/shops/${shopId}/services/${serviceId}`);
        const payload = await parseJsonSafely(response);

        if (!response.ok) {
          throw new Error(payload?.message || "Failed to load service");
        }

        setService(payload || null);
      } catch (fetchError) {
        setError(fetchError.message || "Failed to load service");
      } finally {
        setIsLoading(false);
      }
    };

    fetchServiceDetails();
  }, [shopId, serviceId]);

  const canBook = isAuthenticated && user?.role === ROLES.CUSTOMER;
  const availabilityMap = new Map(
    Array.isArray(service?.weeklyAvailability)
      ? service.weeklyAvailability.map((entry) => [
        typeof entry?.day === "string" ? entry.day.toLowerCase() : "",
        entry
      ])
      : []
  );

  const weeklyAvailability = WEEK_DAYS.map((day) => {
    const daySchedule = availabilityMap.get(day);
    const isOpen =
      typeof daySchedule?.isAvailable === "boolean"
        ? daySchedule.isAvailable
        : Boolean(daySchedule?.isOpen);

    return {
      day,
      isOpen,
      slots: Array.isArray(daySchedule?.slots) ? daySchedule.slots : []
    };
  });

  return (

    <section className="page-block service-details-page">

      {!isLoading && service?.images?.length > 0 && (
        <div className="service-image-gallery">
          <img
            src={service.images[0]}
            alt={service.name}
            className="service-main-image"
          />

          {service.images.length > 1 && (
            <div className="service-thumbnail-row">
              {service.images.slice(1).map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`${service.name} ${index + 2}`}
                  className="service-thumbnail"
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="service-details-layout">
        <aside className="card service-availability-card">
          <h2>Opening times</h2>

          {isLoading ? <p>Loading opening times...</p> : null}
          {error ? <p className="error-text">Opening times are unavailable right now.</p> : null}


          {!isLoading && !error ? (
            <ul className="service-availability-list">
              {weeklyAvailability.map((entry) => (
                <li
                  key={entry.day}
                  className={`service-availability-item${entry.day === todayKey ? " is-today" : ""}${entry.isOpen ? "" : " is-closed"}`}
                >
                  <span className="service-availability-day-wrap">
                    <span className="service-availability-dot" aria-hidden="true" />
                    <span className="service-availability-day">{DAY_LABELS[entry.day]}</span>
                  </span>
                  <span className={`service-availability-time${entry.isOpen ? "" : " is-closed"}`}>
                    {formatDayAvailability(entry)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </aside>

        <div className="home-stack">
          <div className="card">
            <div className="page-title-row">
              <h1>{service?.name || "Service Details"}</h1>
              <Link to={`/shops/${shopId}`}>Visit Shop</Link>
            </div>

            {isLoading ? <p>Loading service details...</p> : null}
            {error ? <p className="error-text">{error}</p> : null}

            {!isLoading && !error && service ? (
              <>
                <p>{service.description || "No description available."}</p>
                <div className="service-meta">
                  <p>
                    <strong>Price:</strong> INR {service.price ?? "N/A"}
                  </p>
                  <p>
                    <strong>Duration:</strong> {service.durationMinutes ?? 30}
                  </p>
                  <p>
                    <strong>Capacity:</strong> {service.capacity ?? 1}
                  </p>
                </div>
              </>
            ) : null}
          </div>

          <div className="card">
            <h2>Booking Access</h2>
            {!isAuthenticated ? (
              <p>
                To book this service, please <Link to="/login">login</Link> as a customer.
              </p>
            ) : null}

            {isAuthenticated && user?.role !== ROLES.CUSTOMER ? (
              <p className="error-text">
                Booking is available for customer role only. Current role: {user?.role}
              </p>
            ) : null}

            {canBook ? (
              <Link className="btn" to={`/shops/${shopId}/services/${serviceId}/book`}>
                Book Appointment
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
