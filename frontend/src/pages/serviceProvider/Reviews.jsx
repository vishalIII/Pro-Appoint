import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { fetchShopReviewSummary, fetchShopReviews } from "./api/providerApi";
import { useProviderWorkspace } from "./hooks/useProviderWorkspace";
import { getDateTimeLabel } from "./utils/dateRange";

export default function ProviderReviewsPage() {
  const { token } = useAuth();
  const { selectedShopId, shops } = useProviderWorkspace();
  const [summary, setSummary] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const shopId = selectedShopId || shops?.[0]?._id;

  const loadReviews = useCallback(async () => {
    if (!token || !shopId) {
      setIsLoading(false);
      setSummary(null);
      setReviews([]);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const [summaryPayload, reviewPayload] = await Promise.all([
        fetchShopReviewSummary({ token, shopId }),
        fetchShopReviews({ token, shopId, page: 1, limit: 20 }),
      ]);

      setSummary(summaryPayload);
      setReviews(Array.isArray(reviewPayload?.reviews) ? reviewPayload.reviews : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load reviews");
      setSummary(null);
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  }, [shopId, token]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  return (
    <section className="provider-page">
      <article className="card">
        <h1>Reviews</h1>
        {isLoading ? <p>Loading reviews...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!isLoading && !error && !shopId ? (
          <p className="muted-text">No shop selected.</p>
        ) : null}

        {!isLoading && !error && summary ? (
          <div className="provider-kpi-grid">
            <div>
              <p>Rating Avg</p>
              <strong>{summary.ratingAvg}</strong>
            </div>
            <div>
              <p>Rating Count</p>
              <strong>{summary.ratingCount}</strong>
            </div>
            <div>
              <p>5-star</p>
              <strong>{summary.ratingBreakdown?.star5 || 0}</strong>
            </div>
            <div>
              <p>1-star</p>
              <strong>{summary.ratingBreakdown?.star1 || 0}</strong>
            </div>
          </div>
        ) : null}

        {!isLoading && !error && reviews.length === 0 ? (
          <p className="muted-text">No reviews yet.</p>
        ) : null}

        {reviews.length > 0 ? (
          <div className="provider-review-list">
            {reviews.map((review) => (
              <article className="provider-review-item" key={review._id}>
                <div>
                  <strong>{review.reviewerId?.name || "Customer"}</strong>
                  <p className="muted-text">{getDateTimeLabel(review.createdAt)}</p>
                  <p>{review.comment || "No comment provided."}</p>
                </div>
                <strong>{review.rating}/5</strong>
              </article>
            ))}
          </div>
        ) : null}
      </article>
    </section>
  );
}
