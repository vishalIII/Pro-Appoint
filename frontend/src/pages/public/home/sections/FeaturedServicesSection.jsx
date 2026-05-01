import SearchCard from "../../../../components/SearchCard";

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
        <div className="search-results-grid">
          {featuredServices.map((result) => (
            <SearchCard
              key={`${result.shop._id}-${result.service._id}`}
              result={result}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
