import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { ROLES } from "../../rbac";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const parseJsonSafely = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return response.json();
};

export default function ServiceDetails() {
  const { shopId, serviceId } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [service, setService] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchServiceDetails = async () => {
      if (!shopId || !serviceId) return;
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_BASE_URL}/shops/${shopId}/services/${serviceId}`);
        const payload = await parseJsonSafely(response);

        if (!response.ok) {
          throw new Error(payload?.message || "Failed to load service");
        }

        setService(payload || null);
      } catch (fetchError) {
        setError(fetchError.message || "Failed to load service");
      } finally {
        setIsLoading(false);
      }
    };

    fetchServiceDetails();
  }, [shopId, serviceId]);

  const canBook = isAuthenticated && user?.role === ROLES.CUSTOMER;

  return (
    <section className="page-block home-stack">
      <div className="card">
        <div className="page-title-row">
          <h1>{service?.name || "Service Details"}</h1>
          <Link to={`/shops/${shopId}`}>Back to Shop</Link>
        </div>

        {isLoading ? <p>Loading service details...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!isLoading && !error && service ? (
          <>
            <p>{service.description || "No description available."}</p>
            <div className="service-meta">
              <p>
                <strong>Price:</strong> INR {service.price ?? "N/A"}
              </p>
              <p>
                <strong>Duration:</strong> Not provided
              </p>
              <p>
                <strong>Capacity:</strong> {service.capacity ?? 1}
              </p>
            </div>
          </>
        ) : null}
      </div>

      <div className="card">
        <h2>Booking Access</h2>
        {!isAuthenticated ? (
          <p>
            To book this service, please <Link to="/login">login</Link> as a customer.
          </p>
        ) : null}

        {isAuthenticated && user?.role !== ROLES.CUSTOMER ? (
          <p className="error-text">
            Booking is available for customer role only. Current role: {user?.role}
          </p>
        ) : null}

        {canBook ? (
          <Link className="btn" to={`/shops/${shopId}/services/${serviceId}/book`}>
            Book Appointment
          </Link>
        ) : null}
      </div>
    </section>
  );
}
