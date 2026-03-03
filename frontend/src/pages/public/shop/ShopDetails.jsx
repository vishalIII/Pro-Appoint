import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const parseJsonSafely = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return response.json();
};

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

  return (
    <section className="page-block home-stack">
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
    </section>
  );
}
