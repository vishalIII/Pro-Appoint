import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { API_BASE_URL } from "../../../config/runtime";

const parseJsonSafely = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return response.json();
};

export default function ShopByCategory() {
  const { category } = useParams();
  const [shops, setShops] = useState([]);
  const [isLoadingShops, setIsLoadingShops] = useState(true);
  const [shopsError, setShopsError] = useState("");

  useEffect(() => {
    const fetchShopsByCategory = async () => {
      if (!category) return;
      setIsLoadingShops(true);
      setShopsError("");

      try {
        const response = await fetch(`${API_BASE_URL}/shops/category/${encodeURIComponent(category)}`);
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

    fetchShopsByCategory();
  }, [category]);

  return (
    <section className="page-block home-stack">
      <div className="card">
        <div className="section-head">
          <h1>Shops in {category}</h1>
          <p>Browse shops in the {category} category.</p>
        </div>

        {isLoadingShops ? <p>Loading shops...</p> : null}
        {shopsError ? <p className="error-text">{shopsError}</p> : null}

        {!isLoadingShops && !shopsError && shops.length === 0 ? (
          <p>No shops found in this category.</p>
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
}
