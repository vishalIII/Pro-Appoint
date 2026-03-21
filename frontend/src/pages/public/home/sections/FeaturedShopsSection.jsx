import { Link } from "react-router-dom";
import { SHOP_PLACEHOLDER_IMAGE } from "../constants";

export default function FeaturedShopsSection({ featuredShops, isLoadingShops, shopsError }) {
  return (
    <>
      <div className="section-head">
        <h2>Featured Shops</h2>
        <p>Discover top-rated shops from your area.</p>
      </div>

      {isLoadingShops ? <p className="muted-text">Loading featured shops...</p> : null}
      {shopsError ? <p className="error-text">{shopsError}</p> : null}
      {!isLoadingShops && !shopsError && featuredShops.length === 0 ? (
        <p className="muted-text">No shops available right now.</p>
      ) : null}

      {featuredShops.length > 0 ? (
        <div className="shop-highlight-grid">
          {featuredShops.map((shop) => (
            <article key={shop.id} className="shop-highlight-card">
              <Link className="shop-highlight-media" to={`/shops/${shop.id}`}>
                <img
                  src={shop.images?.[0] || SHOP_PLACEHOLDER_IMAGE}
                  alt={`${shop.name || "Shop"} preview`}
                  loading="lazy"
                />
              </Link>
              <div className="shop-highlight-body">
                <div className="shop-highlight-head">
                  <h3>{shop.name}</h3>
                  <p className="shop-highlight-rating">
                    <span className="shop-star">★</span>
                    <span>{shop.ratingCount > 0 ? shop.rating.toFixed(1) : "New"}</span>
                    {shop.ratingCount > 0 ? (
                      <span className="shop-rating-count">({shop.ratingCount})</span>
                    ) : null}
                  </p>
                </div>
                <p className="shop-highlight-location">{shop.location}</p>
                <p className="shop-highlight-label">{shop.label}</p>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </>
  );
}
