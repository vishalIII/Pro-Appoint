import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const parseJsonSafely = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return response.json();
};

const formatPrice = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return "Price on request";
  return `INR ${numeric}`;
};

export const Services = ({
  title = "Services",
  subtitle = "Browse services from approved shops.",
  limit = 24
}) => {
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchServices = async () => {
      setIsLoading(true);
      setError("");

      try {
        const shopsResponse = await fetch(`${API_BASE_URL}/shops`);
        const shopsPayload = await parseJsonSafely(shopsResponse);

        if (!shopsResponse.ok) {
          throw new Error(shopsPayload?.message || "Failed to load shops");
        }

        const shops = Array.isArray(shopsPayload?.shops) ? shopsPayload.shops : [];
        if (shops.length === 0) {
          if (!cancelled) setServices([]);
          return;
        }

        const shopNameById = new Map(
          shops.map((shop) => [shop._id, typeof shop?.shopName === "string" ? shop.shopName : "Shop"])
        );

        const groups = await Promise.all(
          shops.slice(0, 12).map(async (shop) => {
            const response = await fetch(`${API_BASE_URL}/shops/${shop._id}/services`);
            const payload = await parseJsonSafely(response);
            if (!response.ok) return [];
            return Array.isArray(payload?.services) ? payload.services : [];
          })
        );

        const merged = groups
          .flat()
          .map((service) => ({
            ...service,
            shopName: shopNameById.get(service?.shopId) || "Shop"
          }))
          .slice(0, limit);

        if (!cancelled) {
          setServices(merged);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError.message || "Failed to load services");
          setServices([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchServices();

    return () => {
      cancelled = true;
    };
  }, [limit]);

  return (
    <section className="page-block home-stack">
      <div className="card">
        <div className="section-head">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        {isLoading ? <p>Loading services...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!isLoading && !error && services.length === 0 ? <p>No services found.</p> : null}

        {!isLoading && !error && services.length > 0 ? (
          <div className="service-grid">
            {services.map((service) => (
              <article key={service._id} className="service-card">
                <h3>{service.name || "Unnamed Service"}</h3>
                <p>{service.description || "No description available."}</p>
                <p>
                  <strong>Shop:</strong> {service.shopName}
                </p>
                <p>
                  <strong>Category:</strong> {service.category || "General"}
                </p>
                <p>
                  <strong>Price:</strong> {formatPrice(service.price)}
                </p>
                <div className="shop-card-actions">
                  <Link className="btn" to={`/shops/${service.shopId}/services/${service._id}`}>
                    View Details
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};
