import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import {
  fetchShopApplicationStatus,
  fetchShopById,
  fetchShopResources,
  fetchShopReviewSummary,
  fetchShopReviews,
  fetchShopServices,
  fetchTenantShops,
  updateTenantShop,
} from "./api/providerApi";
import { useProviderWorkspace } from "./hooks/useProviderWorkspace";
import { getDateLabel, getDateTimeLabel } from "./utils/dateRange";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const toTitleCase = (value) => value.charAt(0).toUpperCase() + value.slice(1);

const emailRegex = /^\S+@\S+\.\S+$/;
const phoneRegex = /^\+?[1-9]\d{1,14}$/;

const getDefaultOpeningHours = () =>
  DAYS.reduce((acc, day) => {
    acc[day] = { open: "09:00", close: "18:00", closed: false };
    return acc;
  }, {});

const TIME_OPTIONS_30_MIN = Array.from({ length: 48 }, (_, index) => {
  const totalMinutes = index * 30;
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
});

const resolveStatusMeta = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "blocked" || normalized === "inactive") {
    return {
      normalized: "inactive",
      isInactive: true,
      isApproved: false,
      isPending: false,
      isRejected: false,
    };
  }

  return {
    normalized,
    isInactive: false,
    isApproved: normalized === "approved",
    isPending: normalized === "pending",
    isRejected: normalized === "rejected",
  };
};

const parseImagesText = (value) =>
  String(value || "")
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const toImagesText = (images) =>
  Array.isArray(images) && images.length > 0 ? images.join("\n") : "";

const buildOpeningHours = (weeklyAvailability) => {
  const openingHours = getDefaultOpeningHours();
  const entries = Array.isArray(weeklyAvailability) ? weeklyAvailability : [];

  for (const day of DAYS) {
    const entry = entries.find(
      (item) => String(item?.day || "").toLowerCase() === day,
    );

    if (!entry || !entry.isOpen) {
      openingHours[day] = { ...openingHours[day], closed: true };
      continue;
    }

    const firstSlot = Array.isArray(entry.slots) ? entry.slots[0] : null;
    const openTime =
      firstSlot?.startTime ||
      firstSlot?.start ||
      entry.openTime ||
      openingHours[day].open;
    const closeTime =
      firstSlot?.endTime ||
      firstSlot?.end ||
      entry.closeTime ||
      openingHours[day].close;

    openingHours[day] = {
      open: openTime,
      close: closeTime,
      closed: false,
    };
  }

  return openingHours;
};

const toWeeklyAvailability = (openingHours) =>
  DAYS.map((day) => {
    const entry = openingHours[day];
    return {
      day,
      isOpen: !entry.closed,
      slots: entry.closed
        ? []
        : [
            {
              startTime: entry.open,
              endTime: entry.close,
            },
          ],
    };
  });

const createEditForm = (shop) => ({
  shopName: shop?.shopName || "",
  description: shop?.description || "",
  contactEmail: shop?.contactEmail || "",
  contactPhone: shop?.contactPhone || "",
  addressStreet: shop?.address?.street || "",
  addressCity: shop?.address?.city || "",
  addressState: shop?.address?.state || "",
  addressPincode: shop?.address?.pincode || "",
  addressLandMark: shop?.address?.landMark || "",
  imagesText: toImagesText(shop?.images),
  openingHours: buildOpeningHours(shop?.weeklyAvailability),
});

const validateEditForm = (form) => {
  const nextErrors = {};

  if (!form.shopName.trim()) {
    nextErrors.shopName = "Shop name is required";
  }

  const email = form.contactEmail.trim();
  if (!email) {
    nextErrors.contactEmail = "Contact email is required";
  } else if (!emailRegex.test(email)) {
    nextErrors.contactEmail = "Enter a valid email";
  }

  const phone = form.contactPhone.trim();
  if (!phone) {
    nextErrors.contactPhone = "Contact phone is required";
  } else if (!phoneRegex.test(phone)) {
    nextErrors.contactPhone = "Enter valid phone in E.164 format";
  }

  const openDays = Object.values(form.openingHours || {}).filter(
    (entry) => entry.closed !== true,
  );
  if (openDays.length === 0) {
    nextErrors.openingHours = "At least one day must be open";
  }

  for (const day of DAYS) {
    const entry = form.openingHours?.[day];
    if (!entry || entry.closed) continue;

    if (!entry.open || !entry.close) {
      nextErrors.openingHours = "Open and close time are required";
      break;
    }

    if (entry.open >= entry.close) {
      nextErrors.openingHours = `${toTitleCase(day)} open time must be earlier than close time`;
      break;
    }
  }

  return nextErrors;
};

const getShopAvailabilityRows = (weeklyAvailability) =>
  DAYS.map((day) => {
    const entry = Array.isArray(weeklyAvailability)
      ? weeklyAvailability.find(
          (item) => String(item?.day || "").toLowerCase() === day,
        )
      : null;

    if (!entry || !entry.isOpen) {
      return `${toTitleCase(day)}: Closed`;
    }

    const slot = Array.isArray(entry.slots) ? entry.slots[0] : null;
    const start = slot?.startTime || slot?.start || entry.openTime || "--:--";
    const end = slot?.endTime || slot?.end || entry.closeTime || "--:--";
    return `${toTitleCase(day)}: ${start} - ${end}`;
  });

export default function ProviderShopsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { refreshShops, setSelectedShopId } = useProviderWorkspace();
  const [shops, setShops] = useState([]);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [openMenuShopId, setOpenMenuShopId] = useState("");
  const [viewShopId, setViewShopId] = useState("");
  const [viewDataByShopId, setViewDataByShopId] = useState({});
  const [viewLoadingByShopId, setViewLoadingByShopId] = useState({});
  const [viewErrorByShopId, setViewErrorByShopId] = useState({});
  const [editShopId, setEditShopId] = useState("");
  const [editForm, setEditForm] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [isSavingShopId, setIsSavingShopId] = useState("");
  const [statusUpdatingShopId, setStatusUpdatingShopId] = useState("");

  const loadShopsData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError("");

    try {
      const [shopPayload, statusPayload] = await Promise.all([
        fetchTenantShops({ token }),
        fetchShopApplicationStatus({ token }).catch(() => null),
      ]);

      setShops(Array.isArray(shopPayload?.shops) ? shopPayload.shops : []);
      setApplicationStatus(statusPayload);
    } catch (loadError) {
      setError(loadError.message || "Failed to load shops");
      setShops([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadShopsData();
    refreshShops();
  }, [loadShopsData, refreshShops]);

  const activeShopForView = useMemo(
    () => shops.find((shop) => String(shop._id) === String(viewShopId)) || null,
    [shops, viewShopId],
  );

  const loadShopViewData = useCallback(
    async (shopId) => {
      if (!token || !shopId) return;

      setViewLoadingByShopId((prev) => ({ ...prev, [shopId]: true }));
      setViewErrorByShopId((prev) => ({ ...prev, [shopId]: "" }));

      try {
        const [shopPayload, servicePayload, resourcePayload, reviewSummaryPayload, reviewPayload] =
          await Promise.all([
            fetchShopById({ token, shopId }),
            fetchShopServices({ token, shopId }).catch(() => ({ services: [] })),
            fetchShopResources({ token, shopId }).catch(() => ({ resources: [] })),
            fetchShopReviewSummary({ token, shopId }).catch(() => null),
            fetchShopReviews({ token, shopId, page: 1, limit: 3 }).catch(() => ({ reviews: [] })),
          ]);

        setViewDataByShopId((prev) => ({
          ...prev,
          [shopId]: {
            shop: shopPayload,
            services: Array.isArray(servicePayload?.services) ? servicePayload.services : [],
            resources: Array.isArray(resourcePayload?.resources) ? resourcePayload.resources : [],
            reviewSummary: reviewSummaryPayload,
            reviews: Array.isArray(reviewPayload?.reviews) ? reviewPayload.reviews : [],
          },
        }));
      } catch (detailsError) {
        setViewErrorByShopId((prev) => ({
          ...prev,
          [shopId]: detailsError.message || "Failed to load shop details",
        }));
      } finally {
        setViewLoadingByShopId((prev) => ({ ...prev, [shopId]: false }));
      }
    },
    [token],
  );

  const handleView = async (shopId) => {
    setEditShopId("");
    setEditErrors({});
    setOpenMenuShopId("");

    if (String(viewShopId) === String(shopId)) {
      setViewShopId("");
      return;
    }

    setViewShopId(shopId);
    await loadShopViewData(shopId);
  };

  const handleEditStart = async (shop) => {
    setViewShopId("");
    setOpenMenuShopId("");
    setError("");

    const statusMeta = resolveStatusMeta(shop.status);
    if (statusMeta.isRejected) {
      return;
    }

    const shopId = String(shop._id);
    const loadedShop = viewDataByShopId?.[shopId]?.shop || shop;
    setEditForm(createEditForm(loadedShop));
    setEditShopId(shopId);
    setEditErrors({});
  };

  const handleEditCancel = () => {
    setEditShopId("");
    setEditForm(null);
    setEditErrors({});
  };

  const handleEditFieldChange = (key, value) => {
    setEditForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleOpeningHoursChange = (day, key, value) => {
    setEditForm((prev) => ({
      ...prev,
      openingHours: {
        ...prev.openingHours,
        [day]: {
          ...prev.openingHours[day],
          [key]: value,
        },
      },
    }));
  };

  const handleEditSave = async (shopId) => {
    if (!editForm || isSavingShopId) return;

    const validationErrors = validateEditForm(editForm);
    setEditErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSavingShopId(shopId);
    setError("");

    try {
      await updateTenantShop({
        token,
        shopId,
        payload: {
          shopName: editForm.shopName.trim(),
          description: editForm.description.trim(),
          contactEmail: editForm.contactEmail.trim(),
          contactPhone: editForm.contactPhone.trim(),
          address: {
            street: editForm.addressStreet.trim(),
            city: editForm.addressCity.trim(),
            state: editForm.addressState.trim(),
            pincode: editForm.addressPincode.trim(),
            landMark: editForm.addressLandMark.trim(),
          },
          images: parseImagesText(editForm.imagesText),
          weeklyAvailability: toWeeklyAvailability(editForm.openingHours),
        },
      });

      setEditShopId("");
      setEditForm(null);
      setEditErrors({});
      await Promise.all([loadShopsData(), refreshShops()]);

      if (String(viewShopId) === String(shopId)) {
        await loadShopViewData(shopId);
      }
    } catch (updateError) {
      setError(updateError.message || "Failed to update shop");
    } finally {
      setIsSavingShopId("");
    }
  };

  const handleToggleShopStatus = async (shop) => {
    if (!token || statusUpdatingShopId) return;
    const statusMeta = resolveStatusMeta(shop.status);

    if (!statusMeta.isApproved && !statusMeta.isInactive) {
      return;
    }

    const nextStatus = statusMeta.isApproved ? "blocked" : "approved";
    setStatusUpdatingShopId(shop._id);
    setError("");

    try {
      await updateTenantShop({
        token,
        shopId: shop._id,
        payload: {
          status: nextStatus,
        },
      });

      await Promise.all([loadShopsData(), refreshShops()]);
      if (String(viewShopId) === String(shop._id)) {
        await loadShopViewData(shop._id);
      }
    } catch (statusError) {
      setError(statusError.message || "Failed to update shop status");
    } finally {
      setStatusUpdatingShopId("");
    }
  };

  const handleManageServices = (shopId) => {
    setSelectedShopId(shopId);
    navigate(`/tenant/shops/${shopId}/services`);
  };

  const handleManageResources = (shopId) => {
    setSelectedShopId(shopId);
    navigate(`/tenant/shops/${shopId}/resources`);
  };

  return (
    <section className="provider-page">
      <article className="card">
        <div className="page-title-row">
          <h1>Shops</h1>
          <Link to="/tenant/shops/create" className="btn">
            Create Shop
          </Link>
        </div>

        {applicationStatus ? (
          <p className="muted-text">
            Latest application status: <strong>{applicationStatus.status}</strong> (
            {getDateLabel(applicationStatus.updatedAt)})
          </p>
        ) : null}

        {isLoading ? <p>Loading shops...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!isLoading && !error && shops.length === 0 ? (
          <div className="actions-row">
            <p className="muted-text">No shops found.</p>
          </div>
        ) : null}

        {!isLoading && !error && shops.length > 0 ? (
          <div className="">
            {shops.map((shop) => {
              const statusMeta = resolveStatusMeta(shop.status);
              const canEdit = !statusMeta.isRejected;
              const canStatusToggle = statusMeta.isApproved || statusMeta.isInactive;
              const canManageSecondary = statusMeta.isApproved;
              const isStatusLoading = String(statusUpdatingShopId) === String(shop._id);
              const menuIsOpen = String(openMenuShopId) === String(shop._id);
              const cardViewData = viewDataByShopId?.[shop._id];
              const isViewActive = String(viewShopId) === String(shop._id);
              const isViewLoading = Boolean(viewLoadingByShopId?.[shop._id]);
              const viewError = viewErrorByShopId?.[shop._id];
              const isEditing = String(editShopId) === String(shop._id);

              return (
                <article className="provider-info-card" key={shop._id}>
                  <h3>{shop.shopName}</h3>
                  <p>
                    Status: <strong>{statusMeta.normalized || "unknown"}</strong>
                  </p>
                  <p>Contact: {shop.contactEmail || "N/A"}</p>
                  <p>Phone: {shop.contactPhone || "N/A"}</p>
                  <p>City: {shop.address?.city || "N/A"}</p>

                  <div className="provider-action-row">
                    <button
                      type="button"
                      className="btn btn-small btn-secondary"
                      onClick={() => handleView(shop._id)}
                    >
                      View
                    </button>

                    {canEdit ? (
                      <button
                        type="button"
                        className="btn btn-small btn-secondary"
                        onClick={() => handleEditStart(shop)}
                      >
                        Edit
                      </button>
                    ) : null}

                    {statusMeta.isRejected ? (
                      <Link to="/tenant/shops/create" className="btn btn-small">
                        Reapply
                      </Link>
                    ) : null}

                    {canStatusToggle ? (
                      <button
                        type="button"
                        className="btn btn-small"
                        onClick={() => handleToggleShopStatus(shop)}
                        disabled={isStatusLoading}
                      >
                        {isStatusLoading
                          ? "Updating..."
                          : statusMeta.isApproved
                            ? "Deactivate"
                            : "Activate"}
                      </button>
                    ) : null}

                    {!statusMeta.isRejected ? (
                      <button
                        type="button"
                        className="btn btn-small btn-secondary"
                        onClick={() =>
                          setOpenMenuShopId((prev) =>
                            String(prev) === String(shop._id) ? "" : shop._id,
                          )
                        }
                        aria-label="Shop actions"
                      >
                        ⋮
                      </button>
                    ) : null}
                  </div>

                  {menuIsOpen ? (
                    <div className="provider-action-row">
                      <button
                        type="button"
                        className="btn btn-small btn-secondary"
                        onClick={() => handleManageServices(shop._id)}
                        disabled={!canManageSecondary}
                      >
                        Services
                      </button>
                      <button
                        type="button"
                        className="btn btn-small btn-secondary"
                        onClick={() => handleManageResources(shop._id)}
                        disabled={!canManageSecondary}
                      >
                        Resources
                      </button>
                    </div>
                  ) : null}

                  {isEditing && editForm ? (
                    <form
                      className="auth-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleEditSave(shop._id);
                      }}
                    >
                      <label className="form-field" htmlFor={`shop-name-${shop._id}`}>
                        Shop Name
                        <input
                          id={`shop-name-${shop._id}`}
                          value={editForm.shopName}
                          onChange={(event) => handleEditFieldChange("shopName", event.target.value)}
                          required
                        />
                        {editErrors.shopName ? (
                          <span className="error-text">{editErrors.shopName}</span>
                        ) : null}
                      </label>

                      <label className="form-field" htmlFor={`shop-description-${shop._id}`}>
                        Description
                        <textarea
                          id={`shop-description-${shop._id}`}
                          rows={3}
                          value={editForm.description}
                          onChange={(event) =>
                            handleEditFieldChange("description", event.target.value)
                          }
                        />
                      </label>

                      <label className="form-field" htmlFor={`shop-contact-email-${shop._id}`}>
                        Contact Email
                        <input
                          id={`shop-contact-email-${shop._id}`}
                          type="email"
                          value={editForm.contactEmail}
                          onChange={(event) =>
                            handleEditFieldChange("contactEmail", event.target.value)
                          }
                          required
                        />
                        {editErrors.contactEmail ? (
                          <span className="error-text">{editErrors.contactEmail}</span>
                        ) : null}
                      </label>

                      <label className="form-field" htmlFor={`shop-contact-phone-${shop._id}`}>
                        Contact Phone
                        <input
                          id={`shop-contact-phone-${shop._id}`}
                          value={editForm.contactPhone}
                          onChange={(event) =>
                            handleEditFieldChange("contactPhone", event.target.value)
                          }
                          required
                        />
                        {editErrors.contactPhone ? (
                          <span className="error-text">{editErrors.contactPhone}</span>
                        ) : null}
                      </label>

                      <label className="form-field" htmlFor={`shop-address-street-${shop._id}`}>
                        Address Street
                        <input
                          id={`shop-address-street-${shop._id}`}
                          value={editForm.addressStreet}
                          onChange={(event) =>
                            handleEditFieldChange("addressStreet", event.target.value)
                          }
                        />
                      </label>

                      <label className="form-field" htmlFor={`shop-address-city-${shop._id}`}>
                        Address City
                        <input
                          id={`shop-address-city-${shop._id}`}
                          value={editForm.addressCity}
                          onChange={(event) =>
                            handleEditFieldChange("addressCity", event.target.value)
                          }
                        />
                      </label>

                      <label className="form-field" htmlFor={`shop-address-state-${shop._id}`}>
                        Address State
                        <input
                          id={`shop-address-state-${shop._id}`}
                          value={editForm.addressState}
                          onChange={(event) =>
                            handleEditFieldChange("addressState", event.target.value)
                          }
                        />
                      </label>

                      <label className="form-field" htmlFor={`shop-address-pincode-${shop._id}`}>
                        Address Pincode
                        <input
                          id={`shop-address-pincode-${shop._id}`}
                          value={editForm.addressPincode}
                          onChange={(event) =>
                            handleEditFieldChange("addressPincode", event.target.value)
                          }
                        />
                      </label>

                      <label className="form-field" htmlFor={`shop-address-landmark-${shop._id}`}>
                        Address Landmark
                        <input
                          id={`shop-address-landmark-${shop._id}`}
                          value={editForm.addressLandMark}
                          onChange={(event) =>
                            handleEditFieldChange("addressLandMark", event.target.value)
                          }
                        />
                      </label>

                      <label className="form-field" htmlFor={`shop-images-${shop._id}`}>
                        Images (comma/newline separated URLs)
                        <textarea
                          id={`shop-images-${shop._id}`}
                          rows={2}
                          value={editForm.imagesText}
                          onChange={(event) =>
                            handleEditFieldChange("imagesText", event.target.value)
                          }
                        />
                      </label>

                      <div className="form-field">
                        Weekly Availability
                        {DAYS.map((day) => {
                          const entry = editForm.openingHours[day];
                          return (
                            <div className="service-meta" key={`${shop._id}-${day}`}>
                              <strong>{toTitleCase(day)}</strong>
                              <label>
                                Closed
                                <input
                                  type="checkbox"
                                  checked={entry.closed}
                                  onChange={(event) =>
                                    handleOpeningHoursChange(day, "closed", event.target.checked)
                                  }
                                />
                              </label>
                              <label>
                                Open
                                <select
                                  value={entry.open}
                                  disabled={entry.closed}
                                  onChange={(event) =>
                                    handleOpeningHoursChange(day, "open", event.target.value)
                                  }
                                >
                                  {TIME_OPTIONS_30_MIN.map((time) => (
                                    <option key={time} value={time}>
                                      {time}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                Close
                                <select
                                  value={entry.close}
                                  disabled={entry.closed}
                                  onChange={(event) =>
                                    handleOpeningHoursChange(day, "close", event.target.value)
                                  }
                                >
                                  {TIME_OPTIONS_30_MIN.map((time) => (
                                    <option key={time} value={time}>
                                      {time}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                          );
                        })}
                        {editErrors.openingHours ? (
                          <span className="error-text">{editErrors.openingHours}</span>
                        ) : null}
                      </div>

                      <div className="provider-action-row">
                        <button
                          type="submit"
                          className="btn btn-small"
                          disabled={String(isSavingShopId) === String(shop._id)}
                        >
                          {String(isSavingShopId) === String(shop._id) ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-small btn-secondary"
                          onClick={handleEditCancel}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : null}

                  {isViewActive ? (
                    <div className="provider-page">
                      {isViewLoading ? <p>Loading shop details...</p> : null}
                      {viewError ? <p className="error-text">{viewError}</p> : null}

                      {!isViewLoading && !viewError && cardViewData ? (
                        <>
                          <div className="provider-kpi-grid">
                            <div>
                              <p>Services</p>
                              <strong>{cardViewData.services.length}</strong>
                            </div>
                            <div>
                              <p>Resources</p>
                              <strong>{cardViewData.resources.length}</strong>
                            </div>
                            <div>
                              <p>Rating Avg</p>
                              <strong>{cardViewData.reviewSummary?.ratingAvg || 0}</strong>
                            </div>
                            <div>
                              <p>Rating Count</p>
                              <strong>{cardViewData.reviewSummary?.ratingCount || 0}</strong>
                            </div>
                          </div>

                          <div className="provider-two-col">
                            <div>
                              <h3>Shop Availability</h3>
                              <div className="provider-checklist">
                                {getShopAvailabilityRows(
                                  cardViewData.shop?.weeklyAvailability || activeShopForView?.weeklyAvailability,
                                ).map((line) => (
                                  <div key={`${shop._id}-${line}`}>
                                    <p>{line}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <h3>Latest Reviews</h3>
                              {cardViewData.reviews.length === 0 ? (
                                <p className="muted-text">No reviews yet.</p>
                              ) : (
                                <div className="provider-review-list">
                                  {cardViewData.reviews.map((review) => (
                                    <article className="provider-review-item" key={review._id}>
                                      <div>
                                        <strong>{review.reviewerId?.name || "Customer"}</strong>
                                        <p className="muted-text">
                                          {getDateTimeLabel(review.createdAt)}
                                        </p>
                                        <p>{review.comment || "No comment provided."}</p>
                                      </div>
                                      <strong>{review.rating}/5</strong>
                                    </article>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                            <hr style={{ margin: "20px 0" }} />
                          
                          <div className="provider-two-col">
                            <div>
                              <h3>Services</h3>
                              {cardViewData.services.length === 0 ? (
                                <p className="muted-text">No services in this shop.</p>
                              ) : (
                                <div className="provider-checklist">
                                  {cardViewData.services.slice(0, 8).map((service) => (
                                    <div key={service._id}>
                                      <p>
                                        {service.name} ({service.durationMinutes} mins)
                                      </p>
                                      <span>{service.isActive ? "Active" : "Inactive"}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div>
                              <h3>Resources / Staff</h3>
                              {cardViewData.resources.length === 0 ? (
                                <p className="muted-text">No resources in this shop.</p>
                              ) : (
                                <div className="provider-checklist">
                                  {cardViewData.resources.slice(0, 8).map((resource) => (
                                    <div key={resource._id}>
                                      <p>
                                        {resource.name} ({resource.type})
                                      </p>
                                      <span>{resource.isActive ? "Active" : "Inactive"}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}
      </article>
    </section>
  );
}
