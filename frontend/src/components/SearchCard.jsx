import { Link } from "react-router-dom";
import LazyImage from "./LazyImage";

const formatPrice = (value) => {
  if (value === undefined || value === null) return "N/A";
  return `₹${value.toFixed(0)}`;
};

export default function SearchCard({ result }) {
  const { shop, service } = result;
  const shopImage = shop.images?.[0] || service.images?.[0] || "";
  const serviceImage = service.images?.[0] || shop.images?.[0] || "";

  return (
    <article className="search-card">
      <div className="search-card-media">
        <LazyImage
          src={serviceImage}
          alt={service.name || "Service image"}
          height={260}
          aspectRatio="4 / 3"
          fetchPriority="low"
        />
        <div className="search-card-shop-badge">
          <LazyImage
            src={shopImage}
            alt={shop.shopName || "Shop image"}
            height={60}
            aspectRatio="1 / 1"
            fetchPriority="low"
          />
        </div>
      </div>

      <div className="search-card-body">
        <div className="search-card-header">
          <h3>{shop.shopName}</h3>
          <p>{shop.address?.city || "Unknown city"}</p>
        </div>

        <p className="search-card-service">{service.name}</p>

        <div className="search-card-meta">
          <span className="search-card-price">{formatPrice(service.price)}</span>
          <span className="search-card-rating">★ {shop.ratingAvg?.toFixed(1) || "New"}</span>
        </div>

        <Link
          to={`/shops/${shop._id}/services/${service._id}`}
          className="btn btn-secondary btn-sm"
        >
          View service
        </Link>
      </div>
    </article>
  );
}
