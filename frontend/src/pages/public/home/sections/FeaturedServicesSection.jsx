import { Link } from "react-router-dom";

export default function FeaturedServicesSection({
  featuredServices,
  isLoadingServices,
  servicesError
}) {
  return (
    <>
      <div className="section-head">
        <h2>Featured Services</h2>
        <p>Live services from approved shops.</p>
      </div>

      {isLoadingServices ? <p className="muted-text">Loading featured services...</p> : null}
      {servicesError ? <p className="error-text">{servicesError}</p> : null}
      {!isLoadingServices && !servicesError && featuredServices.length === 0 ? (
        <p className="muted-text">No services available right now.</p>
      ) : null}

      {featuredServices.length > 0 ? (
        <div className="ogani-product-grid">
          {featuredServices.map((service) => (
            <article key={service.id} className="ogani-product-card">
              <div className={`product-thumb ${service.tone}`}>
                <span>{service.icon}</span>
              </div>
              <p className="product-category">{service.category}</p>
              <h3>{service.name}</h3>
              <p className="product-price">{service.price}</p>
              <Link to={`/shops/${service.shopId}/services/${service.serviceId}`} className="product-link">
                View details
              </Link>
            </article>
          ))}
        </div>
      ) : null}
    </>
  );
}
