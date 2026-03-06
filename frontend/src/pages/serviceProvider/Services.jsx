import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import {
  createShopService,
  deleteShopService,
  fetchShopById,
  fetchShopServices,
  updateShopService,
  fetchShopResources
} from "./api/providerApi";
import { useProviderWorkspace } from "./hooks/useProviderWorkspace";
import StatusPill from "./components/StatusPill";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const defaultDayHours = DAYS.reduce((acc, day) => {
  acc[day] = {
    isOpen: day !== "sunday",
    startTime: "09:00",
    endTime: "18:00",
  };
  return acc;
}, {});

const createInitialForm = () => ({
  name: "",
  description: "",
  category: "",
  price: "",
  durationMinutes: "30",
  capacity: "1",
  discountPercentage: "0",
  imagesText: "",
  dayHours: DAYS.reduce((acc, day) => {
    acc[day] = { ...defaultDayHours[day] };
    return acc;
  }, {}),
  closedPeriods: [],
  requiredResources: [],
});

const toLabel = (day) => day.charAt(0).toUpperCase() + day.slice(1);

const parseImages = (value) =>
  String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const isValidHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const toWeeklyAvailability = (dayHours) =>
  DAYS.map((day) => {
    const item = dayHours[day];
    return {
      day,
      isOpen: Boolean(item?.isOpen),
      slots: item?.isOpen
        ? [
          {
            startTime: item.startTime,
            endTime: item.endTime,
          },
        ]
        : [],
    };
  });

const normalizeShopSlots = (entry) => {
  if (Array.isArray(entry?.slots) && entry.slots.length > 0) {
    return entry.slots
      .map((slot) => ({
        startTime: slot?.startTime || slot?.start || "",
        endTime: slot?.endTime || slot?.end || "",
      }))
      .filter((slot) => slot.startTime && slot.endTime);
  }

  if (entry?.openTime && entry?.closeTime) {
    return [
      {
        startTime: entry.openTime,
        endTime: entry.closeTime,
      },
    ];
  }

  return [];
};

const buildShopAvailabilityByDay = (weeklyAvailability) => {
  const base = DAYS.reduce((acc, day) => {
    acc[day] = {
      isOpen: false,
      slots: [],
      minTime: "09:00",
      maxTime: "18:00",
    };
    return acc;
  }, {});

  if (!Array.isArray(weeklyAvailability)) {
    return base;
  }

  for (const entry of weeklyAvailability) {
    const day = String(entry?.day || "").toLowerCase();
    if (!DAYS.includes(day)) continue;

    const slots = normalizeShopSlots(entry).sort((left, right) =>
      left.startTime.localeCompare(right.startTime),
    );
    const isOpen = Boolean(entry?.isOpen) && slots.length > 0;

    if (!isOpen) {
      base[day] = {
        isOpen: false,
        slots: [],
        minTime: "09:00",
        maxTime: "18:00",
      };
      continue;
    }

    base[day] = {
      isOpen: true,
      slots,
      minTime: slots[0].startTime,
      maxTime: slots[slots.length - 1].endTime,
    };
  }

  return base;
};

const buildDayHoursFromShopAvailability = (availabilityByDay) =>
  DAYS.reduce((acc, day) => {
    const shopDay = availabilityByDay?.[day];
    if (shopDay?.isOpen) {
      acc[day] = {
        isOpen: true,
        startTime: shopDay.minTime,
        endTime: shopDay.maxTime,
      };
      return acc;
    }

    acc[day] = {
      isOpen: false,
      startTime: defaultDayHours[day].startTime,
      endTime: defaultDayHours[day].endTime,
    };
    return acc;
  }, {});

const isWithinShopAvailability = (shopDay, startTime, endTime) => {
  if (!shopDay?.isOpen) return false;
  if (!startTime || !endTime || startTime >= endTime) return false;
  return shopDay.slots.some(
    (slot) => startTime >= slot.startTime && endTime <= slot.endTime,
  );
};

export default function ProviderServicesPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { shopId: routeShopId } = useParams();
  const { shops, selectedShopId, setSelectedShopId, activeShop } = useProviderWorkspace();
  const [shopDetails, setShopDetails] = useState(null);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(createInitialForm);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createShopId, setCreateShopId] = useState("");
  const [createShopDetails, setCreateShopDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formErrors, setFormErrors] = useState({});


  //------------------------------------------
  const [resources, setResources] = useState([]);

  useEffect(() => {
    const loadResources = async () => {
      if (!token || !createShopId) return;

      try {
        const res = await fetchShopResources({
          token,
          shopId: createShopId,
        });

        setResources(res.resources || []);
      } catch {
        setResources([]);
      }
    };

    loadResources();
  }, [token, createShopId]);



  //-----------------------------------------------


  const effectiveShopId = useMemo(
    () => routeShopId || selectedShopId,
    [routeShopId, selectedShopId],
  );

  const approvedShops = useMemo(
    () => shops.filter((shop) => shop.status === "approved"),
    [shops],
  );

  const isCreateServiceEnabled = approvedShops.length > 0;
  const createDisabledMessage = "You can create services only after your shop is approved.";

  const isCurrentShopApproved = useMemo(() => {
    const status = activeShop?.status || shopDetails?.status || "";
    return status === "approved";
  }, [activeShop?.status, shopDetails?.status]);

  const createShopAvailabilityByDay = useMemo(
    () => buildShopAvailabilityByDay(createShopDetails?.weeklyAvailability),
    [createShopDetails?.weeklyAvailability],
  );

  useEffect(() => {
    if (routeShopId && routeShopId !== selectedShopId) {
      setSelectedShopId(routeShopId);
    }
  }, [routeShopId, selectedShopId, setSelectedShopId]);

  useEffect(() => {
    if (!showCreateForm) return;
    if (approvedShops.length === 0) {
      setCreateShopId("");
      return;
    }

    const alreadySelected = approvedShops.some(
      (shop) => String(shop._id) === String(createShopId),
    );
    if (alreadySelected) return;

    const preferredShop = approvedShops.find(
      (shop) => String(shop._id) === String(effectiveShopId),
    );
    setCreateShopId(String(preferredShop?._id || approvedShops[0]._id));
  }, [approvedShops, createShopId, effectiveShopId, showCreateForm]);

  useEffect(() => {
    if (!showCreateForm || !token || !createShopId) {
      setCreateShopDetails(null);
      return;
    }

    let cancelled = false;
    const fallbackShop =
      approvedShops.find((shop) => String(shop._id) === String(createShopId)) || null;

    if (fallbackShop) {
      setCreateShopDetails(fallbackShop);
    }

    const loadCreateShopDetails = async () => {
      try {
        const payload = await fetchShopById({ token, shopId: createShopId });
        if (!cancelled) {
          setCreateShopDetails(payload || fallbackShop);
        }
      } catch {
        if (!cancelled && !fallbackShop) {
          setCreateShopDetails(null);
        }
      }
    };

    loadCreateShopDetails();

    return () => {
      cancelled = true;
    };
  }, [approvedShops, createShopId, showCreateForm, token]);

  useEffect(() => {
    if (!showCreateForm || !createShopId) return;
    setForm((prev) => ({
      ...prev,
      dayHours: buildDayHoursFromShopAvailability(createShopAvailabilityByDay),
    }));
  }, [createShopAvailabilityByDay, createShopId, showCreateForm]);

  useEffect(() => {
    if (showCreateForm && !isCreateServiceEnabled) {
      setShowCreateForm(false);
    }
  }, [isCreateServiceEnabled, showCreateForm]);

  const loadServices = useCallback(async () => {
    if (!token || !effectiveShopId) {
      setServices([]);
      setShopDetails(null);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const [servicePayload, shopPayload] = await Promise.all([
        fetchShopServices({ token, shopId: effectiveShopId }),
        fetchShopById({ token, shopId: effectiveShopId }),
      ]);
      setServices(Array.isArray(servicePayload?.services) ? servicePayload.services : []);
      setShopDetails(shopPayload || null);
    } catch (loadError) {
      setError(loadError.message || "Failed to load services");
      setServices([]);
      setShopDetails(null);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveShopId, token]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const validateForm = () => {
    const nextErrors = {};

    if (!createShopId) {
      nextErrors.createShopId = "Select an approved shop";
    } else {
      const isApprovedTargetShop = approvedShops.some(
        (shop) => String(shop._id) === String(createShopId),
      );
      if (!isApprovedTargetShop) {
        nextErrors.createShopId = "Service can be created only for approved shops";
      }
    }

    if (!form.name.trim()) {
      nextErrors.name = "Service name is required";
    }

    const duration = Number(form.durationMinutes);
    if (!Number.isInteger(duration) || duration < 1) {
      nextErrors.durationMinutes = "Duration must be at least 1 minute";
    }

    if (String(form.price).trim() === "") {
      nextErrors.price = "Price is required";
    }

    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) {
      nextErrors.price = "Price must be 0 or more";
    }

    const capacity = Number(form.capacity);
    if (!Number.isInteger(capacity) || capacity < 1) {
      nextErrors.capacity = "Capacity must be at least 1";
    }

    const discountPercentage = Number(form.discountPercentage);
    if (!Number.isFinite(discountPercentage) || discountPercentage < 0 || discountPercentage > 100) {
      nextErrors.discountPercentage = "Discount must be between 0 and 100";
    }

    const openDays = DAYS.filter((day) => form.dayHours[day]?.isOpen);
    if (openDays.length === 0) {
      nextErrors.weeklyAvailability = "At least one day should be open";
    }

    for (const day of DAYS) {
      const item = form.dayHours[day];
      if (!item?.isOpen) continue;

      if (!item.startTime || !item.endTime || item.startTime >= item.endTime) {
        nextErrors.weeklyAvailability = `Invalid time range for ${toLabel(day)}`;
        break;
      }

      const shopDay = createShopAvailabilityByDay[day];
      if (!shopDay?.isOpen) {
        nextErrors.weeklyAvailability = `${toLabel(day)} is closed for this shop`;
        break;
      }

      if (!isWithinShopAvailability(shopDay, item.startTime, item.endTime)) {
        nextErrors.weeklyAvailability = "Service availability must be within shop availability.";
        break;
      }
    }

    const images = parseImages(form.imagesText);
    if (images.some((imageUrl) => !isValidHttpUrl(imageUrl))) {
      nextErrors.imagesText = "Images must be valid http/https URLs";
    }

    if (!Array.isArray(form.requiredResources) || form.requiredResources.length === 0) {
      nextErrors.requiredResources = "At least one required resource is needed";
    } else {
      for (const resource of form.requiredResources) {

        const resourceId = String(resource.resourceId || "").trim();
        const quantity = Number(resource.quantity);

        if (!resourceId) {
          nextErrors.requiredResources = "Please select a resource";
          break;
        }

        if (!Number.isInteger(quantity) || quantity < 1) {
          nextErrors.requiredResources = "Resource quantity must be at least 1";
          break;
        }

      }
    }

    if (Array.isArray(form.closedPeriods)) {
      for (const period of form.closedPeriods) {
        if (!period.startDate || !period.endDate) {
          nextErrors.closedPeriods = "Closed period needs start and end dates";
          break;
        }
        if (new Date(period.startDate) > new Date(period.endDate)) {
          nextErrors.closedPeriods = "Closed period start date must be before end date";
          break;
        }
      }
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!isCreateServiceEnabled || !createShopId || isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError("");

    try {
      const isApprovedTargetShop = approvedShops.some(
        (shop) => String(shop._id) === String(createShopId),
      );
      if (!isApprovedTargetShop) {
        throw new Error("Service can be created only for approved shops");
      }

      const images = parseImages(form.imagesText);

      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        durationMinutes: Number(form.durationMinutes),
        capacity: Number(form.capacity),
        discountPercentage: Number(form.discountPercentage),
        weeklyAvailability: toWeeklyAvailability(form.dayHours),
        requiredResources: form.requiredResources.map((item) => ({
          resourceId: item.resourceId,
          quantity: Number(item.quantity),
        }))
      };

      if (form.description.trim()) {
        payload.description = form.description.trim();
      }

      if (form.category.trim()) {
        payload.category = form.category.trim();
      }

      if (images.length > 0) {
        payload.images = images;
      }

      const normalizedClosedPeriods = form.closedPeriods
        .filter((item) => item.startDate && item.endDate)
        .map((item) => ({
          startDate: item.startDate,
          endDate: item.endDate,
          ...(item.reason?.trim() ? { reason: item.reason.trim() } : {}),
        }));

      if (normalizedClosedPeriods.length > 0) {
        payload.closedPeriods = normalizedClosedPeriods;
      }

      await createShopService({
        token,
        shopId: createShopId,
        payload,
      });

      const targetShopId = createShopId;

      setForm(createInitialForm());
      setFormErrors({});
      setShowCreateForm(false);
      setSelectedShopId(targetShopId);

      if (String(effectiveShopId) === String(targetShopId)) {
        await loadServices();
      } else {
        navigate(`/tenant/shops/${targetShopId}/services`);
      }
    } catch (createError) {
      setError(createError.message || "Failed to create service");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (service) => {
    if (!effectiveShopId || !isCurrentShopApproved) return;
    setError("");

    try {
      await updateShopService({
        token,
        shopId: effectiveShopId,
        serviceId: service._id,
        payload: { isActive: !service.isActive },
      });
      await loadServices();
    } catch (toggleError) {
      setError(toggleError.message || "Failed to update service");
    }
  };

  const handleDelete = async (serviceId) => {
    if (!effectiveShopId) return;
    setError("");

    try {
      await deleteShopService({
        token,
        shopId: effectiveShopId,
        serviceId,
      });
      await loadServices();
    } catch (deleteError) {
      setError(deleteError.message || "Failed to delete service");
    }
  };

  const addClosedPeriod = () => {
    setForm((prev) => ({
      ...prev,
      closedPeriods: [...prev.closedPeriods, { startDate: "", endDate: "", reason: "" }],
    }));
  };

  const updateClosedPeriod = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      closedPeriods: prev.closedPeriods.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  };

  const removeClosedPeriod = (index) => {
    setForm((prev) => ({
      ...prev,
      closedPeriods: prev.closedPeriods.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const addRequiredResource = () => {
    setForm((prev) => ({
      ...prev,
      requiredResources: [
        ...prev.requiredResources,
        { resourceId: "", quantity: "1" },
      ],
    }));
  };

  const updateRequiredResource = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      requiredResources: prev.requiredResources.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  };

  const removeRequiredResource = (index) => {
    setForm((prev) => ({
      ...prev,
      requiredResources: prev.requiredResources.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const setDayValue = (day, key, value) => {
    setForm((prev) => {
      const shopDay = createShopAvailabilityByDay[day];
      const currentDay = prev.dayHours[day] || { ...defaultDayHours[day] };
      const nextDay = { ...currentDay };

      if (key === "isOpen") {
        nextDay.isOpen = shopDay?.isOpen ? Boolean(value) : false;
        if (nextDay.isOpen && !isWithinShopAvailability(shopDay, nextDay.startTime, nextDay.endTime)) {
          nextDay.startTime = shopDay.minTime;
          nextDay.endTime = shopDay.maxTime;
        }
      } else if (key === "startTime" || key === "endTime") {
        if (!shopDay?.isOpen) {
          return prev;
        }

        let nextValue = value;
        if (nextValue < shopDay.minTime) nextValue = shopDay.minTime;
        if (nextValue > shopDay.maxTime) nextValue = shopDay.maxTime;
        nextDay[key] = nextValue;
      } else {
        nextDay[key] = value;
      }

      return {
        ...prev,
        dayHours: {
          ...prev.dayHours,
          [day]: nextDay,
        },
      };
    });
  };

  if (!effectiveShopId) {
    return (
      <section className="provider-page">
        <article className="card">
          <h1>Services</h1>
          <p className="muted-text">Select a shop from the top header to manage services.</p>
        </article>
      </section>
    );
  }

  return (
    <section className="provider-page">
      <article className="card">
        <div className="page-title-row">
          <h1>Services for {activeShop?.shopName || shopDetails?.shopName || "Selected shop"}</h1>
          <button
            className="btn"
            type="button"
            disabled={!isCreateServiceEnabled}
            title={!isCreateServiceEnabled ? createDisabledMessage : undefined}
            onClick={() => setShowCreateForm((prev) => !prev)}
          >
            {showCreateForm ? "Close Form" : "+ Create Service"}
          </button>
        </div>

        {!isCreateServiceEnabled ? <p className="error-text">{createDisabledMessage}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {showCreateForm ? (
          <form className="auth-form" onSubmit={handleCreate}>
            <label className="form-field" htmlFor="service-shop">
              Shop
              <select
                id="service-shop"
                value={createShopId}
                onChange={(event) => setCreateShopId(event.target.value)}
                required
              >
                <option value="" disabled>
                  Select approved shop
                </option>
                {approvedShops.map((shop) => (
                  <option key={shop._id} value={shop._id}>
                    {shop.shopName}
                  </option>
                ))}
              </select>
              {formErrors.createShopId ? (
                <span className="error-text">{formErrors.createShopId}</span>
              ) : null}
            </label>

            <label className="form-field" htmlFor="service-name">
              Service Name
              <input
                id="service-name"
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
              {formErrors.name ? <span className="error-text">{formErrors.name}</span> : null}
            </label>

            <label className="form-field" htmlFor="service-description">
              Description
              <textarea
                id="service-description"
                rows={3}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </label>

            <div className="service-meta">
              <label className="form-field" htmlFor="service-category">
                Category
                <input
                  id="service-category"
                  type="text"
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                />
              </label>

              <label className="form-field" htmlFor="service-price">
                Price
                <input
                  id="service-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                  required
                />
                {formErrors.price ? <span className="error-text">{formErrors.price}</span> : null}
              </label>

              <label className="form-field" htmlFor="service-duration">
                Duration Minutes
                <input
                  id="service-duration"
                  type="number"
                  min="1"
                  value={form.durationMinutes}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, durationMinutes: event.target.value }))
                  }
                  required
                />
                {formErrors.durationMinutes ? (
                  <span className="error-text">{formErrors.durationMinutes}</span>
                ) : null}
              </label>

              <label className="form-field" htmlFor="service-capacity">
                Capacity
                <input
                  id="service-capacity"
                  type="number"
                  min="1"
                  value={form.capacity}
                  onChange={(event) => setForm((prev) => ({ ...prev, capacity: event.target.value }))}
                />
                {formErrors.capacity ? <span className="error-text">{formErrors.capacity}</span> : null}
              </label>

              <label className="form-field" htmlFor="service-discount">
                Discount Percentage
                <input
                  id="service-discount"
                  type="number"
                  min="0"
                  max="100"
                  value={form.discountPercentage}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, discountPercentage: event.target.value }))
                  }
                />
                {formErrors.discountPercentage ? (
                  <span className="error-text">{formErrors.discountPercentage}</span>
                ) : null}
              </label>
            </div>

            <label className="form-field" htmlFor="service-images">
              Images (comma/newline separated URLs)
              <textarea
                id="service-images"
                rows={2}
                value={form.imagesText}
                onChange={(event) => setForm((prev) => ({ ...prev, imagesText: event.target.value }))}
              />
              {formErrors.imagesText ? <span className="error-text">{formErrors.imagesText}</span> : null}
            </label>

            <div className="form-field">
              Weekly Availability
              {DAYS.map((day) => {
                const shopDay = createShopAvailabilityByDay[day];
                const isDayOpenInShop = Boolean(shopDay?.isOpen);

                return (
                  <div className="service-meta" key={day}>
                    <strong>{toLabel(day)}</strong>
                    <label>
                      Open
                      <input
                        type="checkbox"
                        checked={isDayOpenInShop ? Boolean(form.dayHours[day]?.isOpen) : false}
                        onChange={(event) => setDayValue(day, "isOpen", event.target.checked)}
                        disabled={!isDayOpenInShop}
                      />
                    </label>
                    <label>
                      Start
                      <input
                        type="time"
                        min={shopDay?.minTime || "09:00"}
                        max={shopDay?.maxTime || "18:00"}
                        value={form.dayHours[day]?.startTime || "09:00"}
                        onChange={(event) => setDayValue(day, "startTime", event.target.value)}
                        disabled={!isDayOpenInShop || !form.dayHours[day]?.isOpen}
                      />
                    </label>
                    <label>
                      End
                      <input
                        type="time"
                        min={shopDay?.minTime || "09:00"}
                        max={shopDay?.maxTime || "18:00"}
                        value={form.dayHours[day]?.endTime || "18:00"}
                        onChange={(event) => setDayValue(day, "endTime", event.target.value)}
                        disabled={!isDayOpenInShop || !form.dayHours[day]?.isOpen}
                      />
                    </label>
                    {!isDayOpenInShop ? <span className="muted-text">Shop closed</span> : null}
                  </div>
                );
              })}
              {formErrors.weeklyAvailability ? (
                <span className="error-text">{formErrors.weeklyAvailability}</span>
              ) : null}
            </div>

            <div className="form-field">
              Closed Periods (Optional)
              {form.closedPeriods.map((item, index) => (
                <div className="service-meta" key={`closed-period-${index}`}>
                  <label>
                    Start Date
                    <input
                      type="date"
                      value={item.startDate}
                      onChange={(event) => updateClosedPeriod(index, "startDate", event.target.value)}
                    />
                  </label>
                  <label>
                    End Date
                    <input
                      type="date"
                      value={item.endDate}
                      onChange={(event) => updateClosedPeriod(index, "endDate", event.target.value)}
                    />
                  </label>
                  <label>
                    Reason
                    <input
                      type="text"
                      value={item.reason}
                      onChange={(event) => updateClosedPeriod(index, "reason", event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    onClick={() => removeClosedPeriod(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className="btn btn-secondary btn-small" onClick={addClosedPeriod}>
                Add Closed Period
              </button>
              {formErrors.closedPeriods ? (
                <span className="error-text">{formErrors.closedPeriods}</span>
              ) : null}
            </div>

            <div className="form-field">
              Required Resources

              {form.requiredResources.map((resource, index) => (
                <div className="service-meta" key={index}>

                  <label>
                    Resource
                    <select
                      value={resource.resourceId}
                      onChange={(e) =>
                        updateRequiredResource(index, "resourceId", e.target.value)
                      }
                    >
                      <option value="">Select resource</option>

                      {resources.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.name} ({r.category})
                        </option>
                      ))}

                    </select>
                  </label>

                  <label>
                    Quantity
                    <input
                      type="number"
                      min="1"
                      value={resource.quantity}
                      onChange={(e) =>
                        updateRequiredResource(index, "quantity", e.target.value)
                      }
                    />
                  </label>

                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    onClick={() => removeRequiredResource(index)}
                  >
                    Remove
                  </button>

                </div>
              ))}

              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={addRequiredResource}
              >
                Add Resource
              </button>

            </div>

            <button className="btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Service"}
            </button>
          </form>
        ) : null}

        {isLoading ? <p>Loading services...</p> : null}
        {!isLoading && services.length === 0 ? <p className="muted-text">No services found.</p> : null}

        {services.length > 0 ? (
          <div className="provider-table-wrap">
            <table className="provider-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service._id}>
                    <td>{service.name}</td>
                    <td>{service.category || "N/A"}</td>
                    <td>INR {service.price ?? 0}</td>
                    <td>{service.durationMinutes} mins</td>
                    <td>
                      <StatusPill value={service.isActive ? "active" : "inactive"} />
                    </td>
                    <td>
                      <div className="provider-action-row">
                        <button
                          type="button"
                          className="btn btn-small"
                          onClick={() => handleToggle(service)}
                          disabled={!isCurrentShopApproved}
                          title={!isCurrentShopApproved ? "Shop must be approved to update services" : undefined}
                        >
                          {service.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-small btn-secondary"
                          onClick={() => handleDelete(service._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </article>
    </section>
  );
}
