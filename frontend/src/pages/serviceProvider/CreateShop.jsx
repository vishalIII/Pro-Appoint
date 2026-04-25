import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AlertModal from "../../components/AlertModal";
import { useAuth } from "../../auth/useAuth";
import { createTenantShop, fetchShopIndustries } from "./api/providerApi";
import { useProviderWorkspace } from "./hooks/useProviderWorkspace";
import ImageUploader from "../../components/ImageUploader";
import TimezoneSelectField from "../../components/TimezoneSelectField";
import { getDetectedTimezone, getSupportedTimezoneOptions } from "../../utils/timezone";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const generateTimeOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      options.push(time);
    }
  }
  return options;
};

const TIME_OPTIONS = generateTimeOptions();

const toTitleCase = (value) =>
  value.charAt(0).toUpperCase() + value.slice(1);

const defaultOpeningHours = DAYS.reduce((acc, day) => {
  acc[day] = { open: "09:00", close: "18:00", closed: false };
  return acc;
}, {});

export default function ProviderCreateShopPage() {
  const { token } = useAuth();
  const { refreshShops, setSelectedShopId } = useProviderWorkspace();
  const navigate = useNavigate();
  const timezoneOptions = useMemo(() => getSupportedTimezoneOptions(), []);
  const [form, setForm] = useState({
    shopName: "",
    industry: "",
    description: "",
    contactEmail: "",
    contactPhone: "",
    addressStreet: "",
    addressCity: "",
    addressState: "",
    addressPincode: "",
    addressLandMark: "",
    timezone: getDetectedTimezone(),
    openingHours: defaultOpeningHours,
    images: [],
  });
  const [industries, setIndustries] = useState([]);
  const [industriesLoading, setIndustriesLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const requiredOpenDays = useMemo(
    () =>
      Object.entries(form.openingHours).filter(([, value]) => value.closed !== true)
        .length,
    [form.openingHours],
  );

  useEffect(() => {
    let cancelled = false;

    const loadIndustries = async () => {
      if (!token) return;
      setIndustriesLoading(true);

      try {
        const payload = await fetchShopIndustries({ token });
        const list = Array.isArray(payload) ? payload : [];
        if (cancelled) return;
        setIndustries(list);
      } catch (error) {
        if (!cancelled) {
          setAlertMessage(error.message || "Failed to load industries");
        }
      } finally {
        if (!cancelled) {
          setIndustriesLoading(false);
        }
      }
    };

    loadIndustries();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const validate = () => {
    const nextErrors = {};

    if (!form.shopName.trim()) {
      nextErrors.shopName = "Shop name is required";
    }

    if (!form.industry) {
      nextErrors.industry = "Industry is required";
    }

    const email = form.contactEmail.trim();
    if (!email) {
      nextErrors.contactEmail = "Contact email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      nextErrors.contactEmail = "Enter a valid email";
    }

    const phone = form.contactPhone.trim();
    if (!phone) {
      nextErrors.contactPhone = "Contact phone is required";
    } else if (!/^\+?[1-9]\d{1,14}$/.test(phone)) {
      nextErrors.contactPhone = "Enter valid phone in E.164 format";
    }

    if (!form.images || form.images.length === 0) {
      nextErrors.images = "At least one shop image is required";
    }

    if (!form.timezone) {
      nextErrors.timezone = "Timezone is required";
    }

    if (requiredOpenDays === 0) {
      nextErrors.openingHours = "At least one day must be open";
    }

    for (const day of DAYS) {
      const entry = form.openingHours[day];
      if (entry.closed) continue;
      if (!entry.open || !entry.close) {
        nextErrors.openingHours = "Open/Close time is required for open days";
        break;
      }
      if (entry.open >= entry.close) {
        nextErrors.openingHours = "Open time must be earlier than close time";
        break;
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpeningHoursChange = (day, key, value) => {
    setForm((prev) => ({
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    setAlertMessage("");

    try {
      const payload = await createTenantShop({
        token,
        payload: {
          shopName: form.shopName.trim(),
          industry: form.industry,
          description: form.description.trim(),
          contactEmail: form.contactEmail.trim(),
          contactPhone: form.contactPhone.trim(),
          timezone: form.timezone,
          address: {
            street: form.addressStreet.trim(),
            city: form.addressCity.trim(),
            state: form.addressState.trim(),
            pincode: form.addressPincode.trim(),
            landMark: form.addressLandMark.trim(),
          },
          images: Array.isArray(form.images) ? form.images : [],
          weeklyAvailability: DAYS.map((day) => {
            const entry = form.openingHours[day];
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
          }),
        },
      });

      const createdShop = payload?.shop;
      if (createdShop?._id) {
        setSelectedShopId(createdShop._id);
      }

      await refreshShops();
      navigate("/tenant", { replace: true });
    } catch (error) {
      setAlertMessage(error.message || "Failed to create shop");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="provider-page">
      <article className="card">
        <div className="page-title-row">
          <h1>Create Shop</h1>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/tenant/shops")}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="form-field" htmlFor="shop-name">
            Shop Name
            <input
              id="shop-name"
              name="shopName"
              value={form.shopName}
              onChange={handleChange}
              required
            />
            {errors.shopName ? <span className="error-text">{errors.shopName}</span> : null}
          </label>

          <label className="form-field" htmlFor="shop-industry">
            Industry
            <select
              id="shop-industry"
              name="industry"
              value={form.industry}
              onChange={handleChange}
              required
              disabled={industriesLoading}
            >
              <option value="">Select industry</option>
              {industries.map((industry) => (
                <option key={industry._id} value={industry._id}>
                  {industry.name}
                </option>
              ))}
            </select>
            {errors.industry ? <span className="error-text">{errors.industry}</span> : null}
          </label>

          <label className="form-field" htmlFor="shop-contact-email">
            Contact Email
            <input
              id="shop-contact-email"
              name="contactEmail"
              type="email"
              value={form.contactEmail}
              onChange={handleChange}
              required
            />
            {errors.contactEmail ? (
              <span className="error-text">{errors.contactEmail}</span>
            ) : null}
          </label>

          <label className="form-field" htmlFor="shop-contact-phone">
            Contact Phone
            <input
              id="shop-contact-phone"
              name="contactPhone"
              value={form.contactPhone}
              onChange={handleChange}
              placeholder="+919876543210"
              required
            />
            {errors.contactPhone ? (
              <span className="error-text">{errors.contactPhone}</span>
            ) : null}
          </label>

          <label className="form-field" htmlFor="shop-description">
            Description
            <textarea
              id="shop-description"
              name="description"
              rows={3}
              value={form.description}
              onChange={handleChange}
            />
          </label>

          <TimezoneSelectField
            label="Provider Timezone"
            selectId="shop-timezone"
            value={form.timezone}
            onChange={(value) => setForm((prev) => ({ ...prev, timezone: value }))}
            options={timezoneOptions}
            required
            helperText="Weekly availability will be interpreted in this timezone."
            error={errors.timezone}
            searchPlaceholder="Search abbreviation, timezone, or UTC offset"
          />

          <ImageUploader
            label="Shop Images"
            folder="shops"
            value={form.images}
            onChange={(images) => setForm((prev) => ({ ...prev, images }))}
          />
          {errors.images ? <span className="error-text">{errors.images}</span> : null}

          <label className="form-field" htmlFor="shop-address-street">
            Address Street
            <input
              id="shop-address-street"
              name="addressStreet"
              value={form.addressStreet}
              onChange={handleChange}
            />
          </label>

          <label className="form-field" htmlFor="shop-address-city">
            Address City
            <input
              id="shop-address-city"
              name="addressCity"
              value={form.addressCity}
              onChange={handleChange}
            />
          </label>

          <label className="form-field" htmlFor="shop-address-state">
            Address State
            <input
              id="shop-address-state"
              name="addressState"
              value={form.addressState}
              onChange={handleChange}
            />
          </label>

          <label className="form-field" htmlFor="shop-address-pincode">
            Address Pincode
            <input
              id="shop-address-pincode"
              name="addressPincode"
              value={form.addressPincode}
              onChange={handleChange}
            />
          </label>

          <label className="form-field" htmlFor="shop-address-landmark">
            Address Landmark
            <input
              id="shop-address-landmark"
              name="addressLandMark"
              value={form.addressLandMark}
              onChange={handleChange}
            />
          </label>

          <div className="form-field">
            Opening Hours
            {DAYS.map((day) => {
              const value = form.openingHours[day];
              return (
                <div key={day} className="service-meta">
                  <strong>{toTitleCase(day)}</strong>
                  <label>
                    Closed
                    <input
                      type="checkbox"
                      checked={value.closed}
                      onChange={(event) =>
                        handleOpeningHoursChange(day, "closed", event.target.checked)
                      }
                    />
                  </label>
                  <label>
                    Open
                    <select
                      value={value.open}
                      onChange={(event) =>
                        handleOpeningHoursChange(day, "open", event.target.value)
                      }
                      disabled={value.closed}
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Close
                    <select
                      value={value.close}
                      onChange={(event) =>
                        handleOpeningHoursChange(day, "close", event.target.value)
                      }
                      disabled={value.closed}
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              );
            })}
            {errors.openingHours ? (
              <span className="error-text">{errors.openingHours}</span>
            ) : null}
          </div>

          <button
            type="submit"
            className="btn"
            disabled={isSubmitting || industriesLoading}
          >
            {isSubmitting ? "Creating..." : "Create Shop"}
          </button>
        </form>
      </article>

      <AlertModal
        isOpen={Boolean(alertMessage)}
        message={alertMessage}
        onClose={() => setAlertMessage("")}
      />
    </section>
  );
}
