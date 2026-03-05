import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import {
  fetchShopApplicationStatus,
  fetchShopById,
  fetchShopResources,
  fetchShopServices,
} from "./api/providerApi";
import { useProviderWorkspace } from "./hooks/useProviderWorkspace";
import { getDateLabel } from "./utils/dateRange";

const getChecklist = ({ shop, serviceCount, resourceCount }) => {
  if (!shop) return [];

  return [
    {
      key: "banner",
      label: "Banner image",
      done: Array.isArray(shop.images) && shop.images.length > 0,
    },
    {
      key: "description",
      label: "Description",
      done: Boolean(String(shop.description || "").trim()),
    },
    {
      key: "services",
      label: "Services configured",
      done: serviceCount > 0,
    },
    {
      key: "resources",
      label: "Resources configured",
      done: resourceCount > 0,
    },
    {
      key: "hours",
      label: "Opening hours",
      done:
        Array.isArray(shop.weeklyAvailability) &&
        shop.weeklyAvailability.some((entry) => entry?.isOpen || entry?.isAvailable),
    },
  ];
};

export default function ProviderSettingsPage() {
  const { token } = useAuth();
  const { selectedShopId, shops } = useProviderWorkspace();
  const [shop, setShop] = useState(null);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const shopId = selectedShopId || shops?.[0]?._id;

  const loadSettings = useCallback(async () => {
    if (!token || !shopId) {
      setIsLoading(false);
      setShop(null);
      setChecklist([]);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const [shopPayload, statusPayload, servicesPayload, resourcesPayload] = await Promise.all([
        fetchShopById({ token, shopId }),
        fetchShopApplicationStatus({ token }).catch(() => null),
        fetchShopServices({ token, shopId }).catch(() => ({ services: [] })),
        fetchShopResources({ token, shopId }).catch(() => ({ resources: [] })),
      ]);

      setShop(shopPayload);
      setApplicationStatus(statusPayload);
      setChecklist(
        getChecklist({
          shop: shopPayload,
          serviceCount: Array.isArray(servicesPayload?.services)
            ? servicesPayload.services.length
            : 0,
          resourceCount: Array.isArray(resourcesPayload?.resources)
            ? resourcesPayload.resources.length
            : 0,
        }),
      );
    } catch (loadError) {
      setError(loadError.message || "Failed to load settings");
      setShop(null);
      setChecklist([]);
    } finally {
      setIsLoading(false);
    }
  }, [shopId, token]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const completed = checklist.filter((item) => item.done).length;
  const completionPct = checklist.length ? Math.round((completed / checklist.length) * 100) : 0;

  return (
    <section className="provider-page">
      <article className="card">
        <h1>Settings</h1>
        {isLoading ? <p>Loading settings...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {!isLoading && !error && !shopId ? (
          <p className="muted-text">No shop selected.</p>
        ) : null}

        {shop ? (
          <>
            <p>
              Shop: <strong>{shop.shopName}</strong>
            </p>
            <p>
              Profile completion: <strong>{completionPct}%</strong>
            </p>
            {applicationStatus ? (
              <p className="muted-text">
                Application: {applicationStatus.status} (updated {getDateLabel(applicationStatus.updatedAt)})
              </p>
            ) : null}

            <div className="provider-checklist">
              {checklist.map((item) => (
                <div className={item.done ? "is-done" : "is-pending"} key={item.key}>
                  <span>{item.done ? "Done" : "Missing"}</span>
                  <strong>{item.label}</strong>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </article>
    </section>
  );
}
