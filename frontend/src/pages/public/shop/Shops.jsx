import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const parseJsonSafely = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return response.json();
};

export const Shops = ({ title = "Shops", subtitle = "Browse approved shops." }) => {
  const [shops, setShops] = useState([]);
  const [isLoadingShops, setIsLoadingShops] = useState(true);
  const [shopsError, setShopsError] = useState("");

  useEffect(() => {
    const fetchPublicShops = async () => {
      setIsLoadingShops(true);
      setShopsError("");

      try {
        const response = await fetch(`${API_BASE_URL}/shops`);
        const payload = await parseJsonSafely(response);

        if (!response.ok) {
          throw new Error(payload?.message || "Failed to load shops");
        }

        setShops(Array.isArray(payload?.shops) ? payload.shops : []);
      } catch (error) {
        setShopsError(error.message || "Failed to load shops");
      } finally {
        setIsLoadingShops(false);
      }
    };

    fetchPublicShops();
  }, []);

  return (
    <section className="page-block home-stack">
      <div className="card">
        <div className="section-head">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        {isLoadingShops ? <p>Loading shops...</p> : null}
        {shopsError ? <p className="error-text">{shopsError}</p> : null}

        {!isLoadingShops && !shopsError && shops.length === 0 ? (
          <p>No approved shops found.</p>
        ) : null}

        {!isLoadingShops && !shopsError && shops.length > 0 ? (
          <div className="shops-grid">
            {shops.map((shop) => (
              <article key={shop._id} className="shop-card">
                <h3>{shop.shopName || "Unnamed Shop"}</h3>
                <p>{shop.description || "No description available."}</p>
                <p>
                  <strong>Contact:</strong> {shop.contactPhone || "N/A"}
                </p>
                <p>
                  <strong>Location:</strong>{" "}
                  {[shop?.address?.city, shop?.address?.state].filter(Boolean).join(", ") || "N/A"}
                </p>
                <div className="shop-card-actions">
                  <Link className="btn" to={`/shops/${shop._id}`}>
                    View Services
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
