import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ImageCarousel from "../../../components/ImageCarousel";
import { useAuth } from "../../../auth/useAuth";
import { getShopReviews, createReview } from "../../../api/reviewsApi";
import { ROLES } from "../../../rbac/roles";
import { API_BASE_URL } from "../../../config/runtime";
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
  const { user, isAuthenticated } = useAuth();
  const [shop, setShop] = useState(null);
  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);

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

    const fetchReviews = async () => {
      if (!shopId) return;
      setReviewsLoading(true);
      setReviewsError("");

      try {
        const reviewsData = await getShopReviews(shopId);
        console.log("Fetched reviews data:", reviewsData.reviews);
        setReviews(Array.isArray(reviewsData.reviews) ? reviewsData.reviews : []);
      } catch (fetchError) {
        setReviewsError(fetchError.message || "Failed to load reviews");
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchShopDetails();
    fetchReviews();
  }, [shopId]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated || user?.role !== ROLES.CUSTOMER) return;

    setSubmittingReview(true);
    try {
      await createReview({
        shopId,
        rating: newReview.rating,
        comment: newReview.comment
      });
      setNewReview({ rating: 5, comment: "" });
      // Refresh reviews
      const reviewsData = await getShopReviews(shopId);
      setReviews(Array.isArray(reviewsData) ? reviewsData : []);
    } catch (error) {
      alert("Failed to submit review: " + (error.message || "Unknown error"));
    } finally {
      setSubmittingReview(false);
    }
  };

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
    <section className="page-block shop-details-page">
      {!isLoading && !error && shop?.images?.length > 0 && (
        <div className="service-image-gallery">
          <ImageCarousel
            images={shop.images}
            alt={shop.shopName || "Shop"}
            type="shop"
            height={340}
            aspectRatio="4 / 3"
          />
        </div>
      )}

      <div className="service-details-layout">
        <aside className="card service-availability-card">
          <h2>Opening times</h2>
          <p className="muted-text">Times shown in {shop?.timezone || "UTC"}</p>

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
              <h1>{shop?.shopName || "Shop Details"}</h1>
              <Link to="/shops">Back to Shops</Link>
            </div>

            {isLoading ? <p>Loading shop details...</p> : null}
            {error ? <p className="error-text">{error}</p> : null}

            {!isLoading && !error && shop ? (
              <>
                <p>{shop.description || "No description available."}</p>
                <div className="service-meta">
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
                  <p>
                    <strong>Rating:</strong> {shop.rating ? shop.rating.toFixed(1) : "New"}
                    {shop.ratingCount > 0 ? ` (${shop.ratingCount})` : ""}
                  </p>
                  <p>
                    <strong>Timezone:</strong> {shop.timezone || "UTC"}
                  </p>
                </div>
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

          <div className="card">
            <h2>Reviews</h2>

            {reviewsLoading ? <p>Loading reviews...</p> : null}
            {reviewsError ? <p className="error-text">{reviewsError}</p> : null}

            {!reviewsLoading && !reviewsError && reviews.length === 0 ? <p>No reviews yet.</p> : null}

            {!reviewsLoading && !reviewsError && reviews.length > 0 ? (
              <div className="reviews-list">
                {reviews.map((review) => (
                  <div key={review._id} className="review-item">
                    <div className="review-header">
                      <span className="review-rating">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                      <span className="review-author">{review.reviewerId?.name || "Anonymous"}</span>
                      <span className="review-date">{new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="review-comment">{review.comment}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {isAuthenticated && user?.role === ROLES.CUSTOMER ? (
              <form onSubmit={handleSubmitReview} className="review-form">
                <h3>Add a Review</h3>
                <div className="form-group">
                  <label>Rating:</label>
                  <select
                    value={newReview.rating}
                    onChange={(e) => setNewReview({ ...newReview, rating: Number(e.target.value) })}
                    required
                  >
                    <option value={5}>5 Stars</option>
                    <option value={4}>4 Stars</option>
                    <option value={3}>3 Stars</option>
                    <option value={2}>2 Stars</option>
                    <option value={1}>1 Star</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Comment:</label>
                  <textarea
                    value={newReview.comment}
                    onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                    placeholder="Write your review..."
                    required
                    rows={4}
                  />
                </div>
                <button type="submit" disabled={submittingReview} className="btn">
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </button>
              </form>
            ) : (
              <p>Please <Link to="/login">login</Link> as a customer to add a review.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
