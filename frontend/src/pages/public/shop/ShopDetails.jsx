import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

const SHOP_PLACEHOLDER_IMAGE = "https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg";

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
  if (Array.isArray(daySchedule?.slots) && daySchedule.slots.length > 0) {
    return daySchedule.slots
      .map((slot) => {
        const start = formatTime(slot?.startTime ?? slot?.start);
        const end = formatTime(slot?.endTime ?? slot?.end);
        if (!start || !end) return null;
        return `${start} - ${end}`;
      })
      .filter(Boolean)
      .join(", ");
  }

  const openTime = formatTime(daySchedule?.openTime ?? daySchedule?.startTime);
  const closeTime = formatTime(daySchedule?.closeTime ?? daySchedule?.endTime);
  if (openTime && closeTime) {
    return `${openTime} - ${closeTime}`;
  }

  return "Open";
};

const todayIndex = (new Date().getDay() + 6) % 7;
const todayKey = WEEK_DAYS[todayIndex];

export default function ShopDetails() {
  const { shopId } = useParams();
  const [shop, setShop] = useState(null);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchShopDetails = async () => {
      if (!shopId) return;
      setIsLoading(true);
      setError("");

      try {
        const [shopResponse, servicesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/shops/${shopId}`),
          fetch(`${API_BASE_URL}/shops/${shopId}/services`)
        ]);

        const [shopPayload, servicesPayload] = await Promise.all([
          parseJsonSafely(shopResponse),
          parseJsonSafely(servicesResponse)
        ]);

        if (!shopResponse.ok) {
          throw new Error(shopPayload?.message || "Failed to load shop details");
        }

        if (!servicesResponse.ok) {
          throw new Error(servicesPayload?.message || "Failed to load services");
        }

        setShop(shopPayload || null);
        setServices(Array.isArray(servicesPayload?.services) ? servicesPayload.services : []);
      } catch (fetchError) {
        setError(fetchError.message || "Failed to load shop");
      } finally {
        setIsLoading(false);
      }
    };

    fetchShopDetails();
  }, [shopId]);

  const availabilityMap = new Map(
    Array.isArray(shop?.weeklyAvailability)
      ? shop.weeklyAvailability.map((entry) => [
          typeof entry?.day === "string" ? entry.day.toLowerCase() : "",
          entry
        ])
      : []
  );

  const weeklyAvailability = WEEK_DAYS.map((day) => {
    const daySchedule = availabilityMap.get(day);
    const isOpen =
      typeof daySchedule?.isOpen === "boolean"
        ? daySchedule.isOpen
        : typeof daySchedule?.isAvailable === "boolean"
          ? daySchedule.isAvailable
          : false;

    return {
      day,
      isOpen,
      slots: Array.isArray(daySchedule?.slots) ? daySchedule.slots : [],
      openTime: daySchedule?.openTime,
      closeTime: daySchedule?.closeTime
    };
  });

  return (
    <section className="page-block">
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
          {!isLoading && !error && shop ? (
            <article className="shop-highlight-card">
              <div className="shop-highlight-media">
                <img
                  src={shop.images?.[0] || SHOP_PLACEHOLDER_IMAGE}
                  alt={`${shop.shopName || "Shop"} preview`}
                  loading="lazy"
                />
              </div>
              <div className="shop-highlight-body">
              <div className="shop-highlight-head">
                  <h3>{shop.shopName}</h3>
                  <p className="shop-highlight-rating">
                    <span className="shop-star">★</span>
                    <span>{shop.rating ? shop.rating.toFixed(1) : "New"}</span>
                    {shop.ratingCount > 0 ? (
                      <span className="shop-rating-count">({shop.ratingCount})</span>
                    ) : null}
                  </p>
                </div>
                <p className="shop-highlight-location">
                  {shop.address?.city || shop.address?.landMark || "Location"}
                </p>
                <p className="shop-highlight-label">Featured Shop</p>
              </div>
            </article>
          ) : null}
          <div className="card">
            <div className="page-title-row">
              <h1>{shop?.shopName || "Shop Details"}</h1>
              {/* <Link to="/">Back to Shops</Link> */}
            </div>

            {isLoading ? <p>Loading shop details...</p> : null}
            {error ? <p className="error-text">{error}</p> : null}

            {!isLoading && !error && shop ? (
              <>
                <p>{shop.description || "No description available."}</p>
                <p>
                  <strong>Contact:</strong> {shop.contactPhone || "N/A"}
                </p>
                <p>
                  <strong>Address:</strong>{" "}
                  {[
                    shop?.address?.street,
                    shop?.address?.landMark,
                    shop?.address?.city,
                    shop?.address?.state,
                    shop?.address?.pincode
                  ]
                    .filter(Boolean)
                    .join(", ") || "N/A"}
                </p>
              </>
            ) : null}
          </div>

          <div className="card">
            <h2>Available Services</h2>

            {!isLoading && !error && services.length === 0 ? <p>No active services found.</p> : null}

            {!isLoading && !error && services.length > 0 ? (
              <div className="service-grid">
                {services.map((service) => (
                  <article key={service._id} className="service-card">
                    <h3>{service.name || "Unnamed Service"}</h3>
                    <p>{service.description || "No description available."}</p>
                    <p>
                      <strong>Price:</strong> INR {service.price ?? "N/A"}
                    </p>
                    <Link className="btn" to={`/shops/${shopId}/services/${service._id}`}>
                      View Details
                    </Link>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
