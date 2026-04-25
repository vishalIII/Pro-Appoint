import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AlertModal from "../../components/AlertModal";
import FakePayCheckout from "../../components/FakePayCheckout";
import TimezoneSelectField from "../../components/TimezoneSelectField";
import api from "../../auth/api";
import {
  clearPreferredTimezone,
  formatTimeWindowInTimezone,
  getDetectedTimezone,
  getSavedTimezone,
  getSupportedTimezoneOptions,
  getTodayInTimezone,
  persistPreferredTimezone,
  resolvePreferredTimezone,
} from "../../utils/timezone";
import dayjs from "../../utils/dayjs";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const DEFAULT_PROVIDER_TIMEZONE = "UTC";
const BROWSER_TIMEZONE_OPTION = "__browser__";

const parseJsonSafely = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return response.json();
};

const buildSlotOptionLabel = ({
  startTimeUTC,
  endTimeUTC,
  providerTimezone,
  userTimezone,
}) => {
  const providerLabel = formatTimeWindowInTimezone({
    startTimeUTC,
    endTimeUTC,
    timezone: providerTimezone,
  });
  const userLabel = formatTimeWindowInTimezone({
    startTimeUTC,
    endTimeUTC,
    timezone: userTimezone,
  });

  return `${providerLabel} provider | ${userLabel} your time`;
};

export default function BookingFlow() {
  const { shopId, serviceId } = useParams();
  const navigate = useNavigate();

  const detectedTimezone = useMemo(() => getDetectedTimezone(), []);
  const timezoneOptions = useMemo(() => getSupportedTimezoneOptions(), []);

  const [serviceDuration, setServiceDuration] = useState(30);
  const [serviceInfo, setServiceInfo] = useState(null);
  const [providerTimezone, setProviderTimezone] = useState(
    DEFAULT_PROVIDER_TIMEZONE,
  );
  const [displayTimezone, setDisplayTimezone] = useState(() =>
    resolvePreferredTimezone(),
  );
  const [useBrowserTimezone, setUseBrowserTimezone] = useState(() => !getSavedTimezone());

  const [selectedDate, setSelectedDate] = useState(() =>
    getTodayInTimezone(DEFAULT_PROVIDER_TIMEZONE),
  );
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  const [fakePayCheckout, setFakePayCheckout] = useState(null);
  const [isFakePayOpen, setIsFakePayOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchBookingDetails = async () => {
      if (!shopId || !serviceId) return;

      try {
        const [shopResponse, serviceResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/shops/${shopId}`),
          fetch(`${API_BASE_URL}/shops/${shopId}/services/${serviceId}`),
        ]);

        const [shopPayload, servicePayload] = await Promise.all([
          parseJsonSafely(shopResponse),
          parseJsonSafely(serviceResponse),
        ]);

        if (!shopResponse.ok) {
          throw new Error(shopPayload?.message || "Failed to load shop details");
        }

        if (!serviceResponse.ok) {
          throw new Error(servicePayload?.message || "Failed to load service details");
        }

        if (cancelled) return;

        const nextProviderTimezone =
          shopPayload?.timezone ||
          servicePayload?.providerTimezone ||
          DEFAULT_PROVIDER_TIMEZONE;

        setProviderTimezone(nextProviderTimezone);
        setServiceInfo(servicePayload || null);
        setServiceDuration(servicePayload?.durationMinutes || 30);
      } catch (error) {
        if (!cancelled) {
          setSubmitError(error.message || "Failed to load booking details");
          setServiceInfo(null);
          setProviderTimezone(DEFAULT_PROVIDER_TIMEZONE);
        }
      }
    };

    fetchBookingDetails();

    return () => {
      cancelled = true;
    };
  }, [shopId, serviceId]);

  useEffect(() => {
    const providerToday = getTodayInTimezone(providerTimezone);

    setSelectedDate((current) => {
      if (!current || current < providerToday) {
        return providerToday;
      }
      return current;
    });
  }, [providerTimezone]);

  useEffect(() => {
    if (!shopId || !serviceId || !selectedDate || !serviceDuration) return;

    const controller = new AbortController();

    const fetchSlots = async () => {
      setSubmitError("");
      setAvailableSlots([]);
      setSelectedSlot("");

      try {
        const queryParams = new URLSearchParams({
          date: selectedDate,
          slotIntervalMinutes: String(serviceDuration),
          userTimezone: displayTimezone,
        });

        const response = await fetch(
          `${API_BASE_URL}/shops/${shopId}/services/${serviceId}/slots?${queryParams.toString()}`,
          { signal: controller.signal },
        );

        const payload = await parseJsonSafely(response);

        if (!response.ok || !payload) {
          throw new Error(payload?.message || "Failed to load available slots");
        }

        const rawSlots = Array.isArray(payload?.slots) ? payload.slots : [];
        const now = dayjs.utc();
        const slots = rawSlots
          .map((slot) => ({
            startTimeUTC: slot?.startTimeUTC,
            endTimeUTC: slot?.endTimeUTC,
          }))
          .filter(
            (slot) =>
              dayjs.utc(slot.startTimeUTC).isValid() &&
              dayjs.utc(slot.endTimeUTC).isValid(),
          )
          .filter((slot) => dayjs.utc(slot.startTimeUTC).isAfter(now));

        setAvailableSlots(slots);

        if (payload?.providerTimezone) {
          setProviderTimezone(payload.providerTimezone);
        }
      } catch (error) {
        if (error?.name !== "AbortError") {
          setSelectedSlot("");
          setSubmitError(error.message || "Failed to load available slots");
        }
      }
    };

    fetchSlots();

    return () => {
      controller.abort();
    };
  }, [shopId, serviceId, selectedDate, serviceDuration, displayTimezone]);

  const providerToday = useMemo(
    () => getTodayInTimezone(providerTimezone),
    [providerTimezone],
  );

  const selectedSlotDetails = useMemo(
    () =>
      availableSlots.find((slot) => slot.startTimeUTC === selectedSlot) || null,
    [availableSlots, selectedSlot],
  );

  const showPopupError = (message) => {
    const text = message || "Failed to create appointment";
    setSubmitError("");
    setPopupMessage(text);
  };

  const handleTimezoneChange = (value) => {
    if (value === BROWSER_TIMEZONE_OPTION) {
      clearPreferredTimezone();
      setUseBrowserTimezone(true);
      setDisplayTimezone(detectedTimezone);
      return;
    }

    persistPreferredTimezone(value);
    setUseBrowserTimezone(false);
    setDisplayTimezone(value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setSuccessMessage("");
    setPopupMessage("");

    if (isSubmitting) return;
    if (!selectedSlotDetails) {
      setSubmitError("Please select a slot.");
      return;
    }

    const startDate = dayjs.utc(selectedSlotDetails.startTimeUTC);
    const endDate = dayjs.utc(selectedSlotDetails.endTimeUTC);

    if (!startDate.isValid() || !endDate.isValid()) {
      setSubmitError("Please select a valid start date and time.");
      return;
    }

    if (startDate.isBefore(dayjs.utc())) {
      showPopupError("Please select a future time slot.");
      return;
    }

    const payload = {
      startTimeUTC: startDate.toISOString(),
      endTimeUTC: endDate.toISOString(),
      userTimezone: displayTimezone,
    };

    if (serviceInfo?.mode === "offline") {
      payload.paymentMethod = paymentMethod === "cash" ? "cash" : "card";
      if (paymentMethod === "online") {
        payload.paymentGateway = "fakepay";
      }
    }

    setIsSubmitting(true);

    try {
      if (serviceInfo?.mode === "online" || paymentMethod === "online") {
        const orderResponse = await api.post("/payment/create-order", {
          amount: serviceInfo?.price,
          paymentGateway: "fakepay",
        });

        setFakePayCheckout({
          appointment: null,
          orderPayload: orderResponse?.data,
          serviceInfo,
          startDate: startDate.toDate(),
          endDate: endDate.toDate(),
          payload,
        });
        setIsFakePayOpen(true);
        setIsSubmitting(false);
        return;
      }

      await api.post(`/shops/${shopId}/services/${serviceId}/appointments`, payload);

      setSuccessMessage("Appointment booked successfully.");
      setTimeout(() => navigate("/bookings", { replace: true }), 700);
    } catch (error) {
      showPopupError(error.message || "Failed to create appointment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page-block">
      <div className="card auth-card">
        <div className="page-title-row">
          <h1>Book Appointment</h1>
          <Link to={`/shops/${shopId}/services/${serviceId}`}>Back to Service</Link>
        </div>

        <p className="muted-text">
          Provider availability is defined in <strong>{providerTimezone}</strong>.
          {" "}
          Your display timezone is <strong>{displayTimezone}</strong>.
        </p>

        {submitError ? <p className="error-text">{submitError}</p> : null}
        {successMessage ? <p className="success-text">{successMessage}</p> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <TimezoneSelectField
            label="Display Timezone"
            selectId="booking-display-timezone"
            value={useBrowserTimezone ? BROWSER_TIMEZONE_OPTION : displayTimezone}
            onChange={handleTimezoneChange}
            options={timezoneOptions}
            leadingOptions={[
              {
                value: BROWSER_TIMEZONE_OPTION,
                label: `Browser default (${detectedTimezone})`,
                triggerLabel: `Browser default (${detectedTimezone})`,
                primaryText: "Browser default",
                secondaryText: detectedTimezone,
                tertiaryText: "Use the timezone detected from this browser",
                searchText: `Browser default ${detectedTimezone}`,
              },
            ]}
            helperText="Times are auto-detected from your browser, but you can override them here."
            searchPlaceholder="Search abbreviation, timezone, or UTC offset"
          />

          <label className="form-field">
            Select Date
            <input
              type="date"
              value={selectedDate}
              min={providerToday}
              onChange={(event) => setSelectedDate(event.target.value)}
              required
            />
            <span className="muted-text">
              This date uses the provider calendar in {providerTimezone}.
            </span>
          </label>

          <label className="form-field">
            Available Slots
            {availableSlots.length === 0 ? (
              <p className="muted-text">No available slots for this provider date.</p>
            ) : (
              <select
                value={selectedSlot}
                onChange={(event) => setSelectedSlot(event.target.value)}
                required
              >
                <option value="">Select slot</option>
                {availableSlots.map((slot) => (
                  <option key={slot.startTimeUTC} value={slot.startTimeUTC}>
                    {buildSlotOptionLabel({
                      startTimeUTC: slot.startTimeUTC,
                      endTimeUTC: slot.endTimeUTC,
                      providerTimezone,
                      userTimezone: displayTimezone,
                    })}
                  </option>
                ))}
              </select>
            )}
          </label>

          {selectedSlotDetails ? (
            <div className="form-field">
              <div className="readonly-field">
                <div>
                  <strong>Provider time:</strong>{" "}
                  {formatTimeWindowInTimezone({
                    startTimeUTC: selectedSlotDetails.startTimeUTC,
                    endTimeUTC: selectedSlotDetails.endTimeUTC,
                    timezone: providerTimezone,
                  })}{" "}
                  ({providerTimezone})
                </div>
                <div>
                  <strong>Your time:</strong>{" "}
                  {formatTimeWindowInTimezone({
                    startTimeUTC: selectedSlotDetails.startTimeUTC,
                    endTimeUTC: selectedSlotDetails.endTimeUTC,
                    timezone: displayTimezone,
                  })}{" "}
                  ({displayTimezone})
                </div>
              </div>
            </div>
          ) : null}

          {serviceInfo?.mode === "offline" ? (
            <label className="form-field">
              Payment Method
              <div
                className="payment-toggle-group"
                style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}
              >
                <button
                  type="button"
                  className="btn"
                  style={{
                    flex: 1,
                    opacity: paymentMethod === "cash" ? 1 : 0.6,
                    backgroundColor: paymentMethod === "cash" ? "#10b981" : "#6b7280",
                  }}
                  onClick={() => setPaymentMethod("cash")}
                >
                  Pay Cash
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{
                    flex: 1,
                    opacity: paymentMethod === "online" ? 1 : 0.6,
                    backgroundColor:
                      paymentMethod === "online" ? "#10b981" : "#6b7280",
                  }}
                  onClick={() => setPaymentMethod("online")}
                >
                  Pay Online
                </button>
              </div>
            </label>
          ) : null}

          <label className="form-field">
            Duration
            <div className="readonly-field">{serviceDuration} minutes</div>
          </label>

          <button className="btn" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Processing..."
              : serviceInfo?.mode === "online" || paymentMethod === "online"
                ? "Pay & Book Appointment"
                : "Confirm Booking"}
          </button>
        </form>
      </div>

      <FakePayCheckout
        isOpen={isFakePayOpen}
        appointment={fakePayCheckout?.appointment}
        orderPayload={fakePayCheckout?.orderPayload}
        serviceInfo={fakePayCheckout?.serviceInfo}
        startDate={fakePayCheckout?.startDate}
        endDate={fakePayCheckout?.endDate}
        payload={fakePayCheckout?.payload}
        shopId={shopId}
        serviceId={serviceId}
        onSuccess={() => {
          setIsFakePayOpen(false);
          setFakePayCheckout(null);
          setSuccessMessage("Appointment booked and paid successfully.");
          setTimeout(() => navigate("/bookings", { replace: true }), 700);
        }}
        onCancel={() => {
          setIsFakePayOpen(false);
          setFakePayCheckout(null);
        }}
      />

      <AlertModal
        isOpen={Boolean(popupMessage)}
        message={popupMessage}
        onClose={() => setPopupMessage("")}
      />
    </section>
  );
}
