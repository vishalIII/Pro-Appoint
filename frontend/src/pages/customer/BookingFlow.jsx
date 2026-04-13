import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import AlertModal from "../../components/AlertModal";
import FakePayCheckout from "../../components/FakePayCheckout";
import api from "../../auth/api";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(utc);
dayjs.extend(customParseFormat);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";


const getTodayDate = () => dayjs().format("YYYY-MM-DD");

// const toLocalDateTimeValue = (date) => {
//   const year = date.getFullYear();
//   const month = String(date.getMonth() + 1).padStart(2, "0");
//   const day = String(date.getDate()).padStart(2, "0");
//   const hours = String(date.getHours()).padStart(2, "0");
//   const minutes = String(date.getMinutes()).padStart(2, "0");
//   return `${year}-${month}-${day}T${hours}:${minutes}`;
// };

const parseJsonSafely = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return response.json();
};


const parseTimeOnDateUTC = (date, timeText) => {
  const match =
    typeof timeText === "string"
      ? timeText.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/)
      : null;
  if (!match) return null;

  const candidate = dayjs
    .utc(date)
    .hour(Number(match[1]))
    .minute(Number(match[2]))
    .second(0)
    .millisecond(0);

  if (!candidate.isValid()) {
    return null;
  }

  return candidate.toDate();
};

// const getMinStartTimeLocal = () => {
//   const now = new Date();
//   now.setSeconds(0, 0);
//   return toLocalDateTimeValue(now);
// };

const getDayNameUTC = (date) => {
  const dayNames = [
    "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"
  ];
  const index = dayjs.utc(date).day();
  return dayNames[index] || "sunday";
};

const normalizeShopSchedule = (payload) => ({
  weeklyAvailability: Array.isArray(payload?.weeklyAvailability) ? payload.weeklyAvailability : [],
  closedPeriods: Array.isArray(payload?.closedPeriods) ? payload.closedPeriods : []
});

const normalizeServiceSchedule = (payload) => ({
  weeklyAvailability: Array.isArray(payload?.weeklyAvailability) ? payload.weeklyAvailability : [],
  closedPeriods: Array.isArray(payload?.closedPeriods) ? payload.closedPeriods : []
});

const toUtcDateOrNull = (value) => {
  if (!value) return null;
  const parsed = dayjs.utc(value);
  return parsed.isValid() ? parsed.toDate() : null;
};

const isClosedForDateRange = ({ bookingDate, closedPeriods }) => {
  if (!Array.isArray(closedPeriods) || closedPeriods.length === 0) {
    return false;
  }

  const dayStart = dayjs.utc(bookingDate).startOf("day").toDate();
  const dayEnd = dayjs.utc(bookingDate).add(1, "day").toDate();

  return closedPeriods.some((period) => {
    const periodStart = toUtcDateOrNull(period?.startDate);
    const periodEnd = toUtcDateOrNull(period?.endDate);
    if (!periodStart || !periodEnd) {
      return false;
    }
    return dayStart < periodEnd && dayEnd > periodStart;
  });
};

const getDayAvailability = (schedule, bookingDate) => {
  if (!schedule) return null;
  const dayName = getDayNameUTC(bookingDate);
  return (
    schedule.weeklyAvailability.find(
      (entry) =>
        typeof entry?.day === "string" &&
        entry.day.toLowerCase() === dayName
    ) || null
  );
};

const isSameUtcDate = (left, right) =>
  dayjs.utc(left).isSame(dayjs.utc(right), "day");

const isDayOpen = (dayAvailability) => {
  if (!dayAvailability) return false;
  if (typeof dayAvailability.isOpen === "boolean") {
    return dayAvailability.isOpen;
  }
  if (typeof dayAvailability.isAvailable === "boolean") {
    return dayAvailability.isAvailable;
  }
  return false;
};

const getDayRangesOnDateUTC = ({ bookingDate, dayAvailability }) => {
  if (!dayAvailability) return [];

  const ranges = [];
  const slotList = Array.isArray(dayAvailability.slots) ? dayAvailability.slots : [];

  for (const slot of slotList) {
    const startCandidate = slot?.startTime ?? slot?.start;
    const endCandidate = slot?.endTime ?? slot?.end;
    const windowStart = parseTimeOnDateUTC(bookingDate, startCandidate);
    const windowEnd = parseTimeOnDateUTC(bookingDate, endCandidate);

    if (!windowStart || !windowEnd || windowStart >= windowEnd) {
      continue;
    }

    ranges.push({ start: windowStart, end: windowEnd });
  }

  if (ranges.length > 0) {
    ranges.sort((left, right) => left.start.getTime() - right.start.getTime());
    return ranges;
  }

  const rangeStartText =
    typeof dayAvailability.openTime === "string" ? dayAvailability.openTime : dayAvailability.startTime;
  const rangeEndText =
    typeof dayAvailability.closeTime === "string" ? dayAvailability.closeTime : dayAvailability.endTime;

  if (rangeStartText && rangeEndText) {
    const rangeStart = parseTimeOnDateUTC(bookingDate, rangeStartText);
    const rangeEnd = parseTimeOnDateUTC(bookingDate, rangeEndText);
    if (rangeStart && rangeEnd && rangeStart < rangeEnd) {
      return [{ start: rangeStart, end: rangeEnd }];
    }
  }

  return ranges;
};

const isWithinAnyRange = ({ bookingStart, bookingEnd, ranges }) =>
  ranges.some((range) => bookingStart >= range.start && bookingEnd <= range.end);

const isScheduleClosedByDateRange = ({ schedule, bookingDate }) =>
  Boolean(schedule) &&
  isClosedForDateRange({
    bookingDate,
    closedPeriods: schedule.closedPeriods
  });

const getAvailabilityPopupMessage = ({ shopSchedule, serviceSchedule, bookingStart, bookingEnd }) => {
  if (!shopSchedule || !serviceSchedule) {
    return "";
  }

  if (!isSameUtcDate(bookingStart, bookingEnd)) {
    return "Booking time is outside shop working hours.";
  }

  if (isScheduleClosedByDateRange({ schedule: shopSchedule, bookingDate: bookingStart })) {
    return "Shop is closed on selected day.";
  }

  const shopDayAvailability = getDayAvailability(shopSchedule, bookingStart);
  if (!isDayOpen(shopDayAvailability)) {
    return "Shop is closed on selected day.";
  }

  const shopRanges = getDayRangesOnDateUTC({
    bookingDate: bookingStart,
    dayAvailability: shopDayAvailability
  });

  if (
    shopRanges.length === 0 ||
    !isWithinAnyRange({
      bookingStart,
      bookingEnd,
      ranges: shopRanges
    })
  ) {
    return "Booking time is outside shop working hours.";
  }

  if (isScheduleClosedByDateRange({ schedule: serviceSchedule, bookingDate: bookingStart })) {
    return "Service is not available at selected time.";
  }

  const serviceDayAvailability = getDayAvailability(serviceSchedule, bookingStart);
  if (!isDayOpen(serviceDayAvailability)) {
    return "Service is not available at selected time.";
  }

  const serviceRanges = getDayRangesOnDateUTC({
    bookingDate: bookingStart,
    dayAvailability: serviceDayAvailability
  });

  if (
    serviceRanges.length === 0 ||
    !isWithinAnyRange({
      bookingStart,
      bookingEnd,
      ranges: serviceRanges
    })
  ) {
    return "Service is not available at selected time.";
  }

  return "";
};


 

export default function BookingFlow() {
  const { shopId, serviceId } = useParams();
  const { token: _token } = useAuth();
  const navigate = useNavigate();

  // const defaultStartTime = useMemo(() => {
  //   const now = new Date();
  //   now.setMinutes(now.getMinutes() + 60);
  //   now.setSeconds(0, 0);
  //   return toLocalDateTimeValue(now); 
  // }, []);

//   const [form, setForm] = useState({
//   startTimeLocal: defaultStartTime,
//   durationMinutes: 30,
// });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  // const [minStartTimeLocal, setMinStartTimeLocal] = useState(() => getMinStartTimeLocal())
  const [shopSchedule, setShopSchedule] = useState(null);
  const [serviceSchedule, setServiceSchedule] = useState(null);
  const [serviceDuration, setServiceDuration] = useState(30);

  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [availableSlots, setAvailableSlots] = useState([]);
const [selectedSlot, setSelectedSlot] = useState("");

  const [serviceInfo, setServiceInfo] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [fakePayCheckout, setFakePayCheckout] = useState(null);
  const [isFakePayOpen, setIsFakePayOpen] = useState(false);


  useEffect(() => {
    if (!shopId || !serviceId || !selectedDate || !serviceDuration) return;

    const controller = new AbortController();

    const fetchSlots = async () => {
      setSubmitError("");   // reset previous error
      setAvailableSlots([]);
      setSelectedSlot("");

      try {
        const queryParams = new URLSearchParams({
          date: selectedDate,
          slotIntervalMinutes: String(serviceDuration),
          tzOffsetMinutes: String(dayjs().utcOffset()),
        });

        const response = await fetch(
          `${API_BASE_URL}/shops/${shopId}/services/${serviceId}/slots?${queryParams.toString()}`,
          { signal: controller.signal },
        );

        const payload = await parseJsonSafely(response);

        if (!response.ok || !payload) {
          throw new Error(payload?.message || "Failed to load available slots");
        }
        const rawSlots = Array.isArray(payload.slots) ? payload.slots : [];
        console.log("RAW SLOTS FROM API:", rawSlots);
        const now = dayjs.utc();
        const cutoff = now.add(60, "second");
        const today = getTodayDate();

        const slots = rawSlots
          .map((slot) => (slot?.startTimeUTC ? dayjs.utc(slot.startTimeUTC) : null))
          .filter((slot) => slot && slot.isValid())
          .filter((slot) => {
            if (selectedDate !== today) return true;
            return slot.isAfter(cutoff);
          });

        setAvailableSlots(slots);
    
        // do not auto-select slot
        setSelectedSlot("");

      } catch (error) {
        if (error?.name !== "AbortError") {
          // setAvailableSlots([]);
          setSelectedSlot("");
          setSubmitError(error.message || "Failed to load available slots");
        }
      }
    };

    fetchSlots();

    return () => {
      controller.abort();
    };

  }, [shopId, serviceId, selectedDate, serviceDuration]);

  useEffect(() => {
    let cancelled = false;
    setShopSchedule(null);
    setServiceSchedule(null);

    const fetchBookingSchedules = async () => {
      if (!shopId || !serviceId) return;

      try {
        const [shopResponse, serviceResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/shops/${shopId}`),
          fetch(`${API_BASE_URL}/shops/${shopId}/services/${serviceId}`)
        ]);

        const [shopPayload, servicePayload] = await Promise.all([
          parseJsonSafely(shopResponse),
          parseJsonSafely(serviceResponse)
        ]);

        // Shop schedule
        if (!shopResponse.ok || !shopPayload) {
          if (!cancelled) setShopSchedule(null);
        } else if (!cancelled) {
          setShopSchedule(normalizeShopSchedule(shopPayload));
        }

        // Service schedule + duration
        if (!serviceResponse.ok || !servicePayload) {
          if (!cancelled) {
            setServiceSchedule(null);
          }
        } else if (!cancelled) {
          setServiceSchedule(normalizeServiceSchedule(servicePayload));
setServiceDuration(servicePayload.durationMinutes || 30);
          setServiceInfo(servicePayload);
        }

      } catch {
        if (!cancelled) {
          setShopSchedule(null);
          setServiceSchedule(null);
        }
      }
    };

    fetchBookingSchedules();
    return () => {
      cancelled = true;
    };

  }, [shopId, serviceId]);


  // useEffect(() => {
  //   setMinStartTimeLocal(getMinStartTimeLocal());
  //   const intervalId = window.setInterval(() => {
  //     setMinStartTimeLocal(getMinStartTimeLocal());
  //   }, 30000);

  //   return () => {
  //     window.clearInterval(intervalId);
  //   };
  // }, []);

 const showPopupError = (message) => {
  const text = message || "Failed to create appointment";
  setSubmitError(""); // clear inline error
  setPopupMessage(text);
};

  const closePopup = () => {
    setPopupMessage("");
  };

  // const handleChange = (event) => {
  //   const { name, value } = event.target;
  //   setForm((prev) => ({ ...prev, [name]: value }));
  // };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setSuccessMessage("");
    setPopupMessage("");
    if (isSubmitting) return;
    if (!selectedSlot) {
      setSubmitError("Please select a slot.");
      return;
    }
    const startDate = dayjs.utc(selectedSlot);

    if (!startDate.isValid()) {
      setSubmitError("Please select a valid start date and time.");
      return;
    }

    const durationMinutes = Number(serviceDuration);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      setSubmitError("Duration must be greater than 0.");
      return;
    }

    const now = dayjs.utc();
    if (startDate.valueOf() <= now.valueOf()) {
      showPopupError("Please select current or future date and time.");
      return;
    }

    const endDate = startDate.add(durationMinutes, "minute");

    let selectedShopSchedule = shopSchedule;
    let selectedServiceSchedule = serviceSchedule;

    if ((!selectedShopSchedule || !selectedServiceSchedule) && shopId && serviceId) {
      try {
        const [shopResponse, serviceResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/shops/${shopId}`),
          fetch(`${API_BASE_URL}/shops/${shopId}/services/${serviceId}`)
        ]);
        const [shopPayload, servicePayload] = await Promise.all([
          parseJsonSafely(shopResponse),
          parseJsonSafely(serviceResponse)
        ]);

        if (shopResponse.ok && shopPayload) {
          selectedShopSchedule = normalizeShopSchedule(shopPayload);
          setShopSchedule(selectedShopSchedule);
        }

        if (serviceResponse.ok && servicePayload) {
          selectedServiceSchedule = normalizeServiceSchedule(servicePayload);
          setServiceSchedule(selectedServiceSchedule);
        }
      } catch {
        selectedShopSchedule = null;
        selectedServiceSchedule = null;
      }
    }

    const availabilityPopupMessage = getAvailabilityPopupMessage({
      shopSchedule: selectedShopSchedule,
      serviceSchedule: selectedServiceSchedule,
      bookingStart: startDate.toDate(),
      bookingEnd: endDate.toDate()
    });

    if (availabilityPopupMessage) {
      showPopupError(availabilityPopupMessage);
      return;
    }

const payload = {
  startTimeUTC: startDate.toISOString(),
  endTimeUTC: endDate.toISOString(),
};
if (serviceInfo?.mode === 'offline') {
  payload.paymentMethod = paymentMethod === 'cash' ? 'cash' : 'card';
  if (paymentMethod === 'online') {
    payload.paymentGateway = 'fakepay';
  }
}

    // if (form.mode === "online") {
    //   payload.meeting = {
    //     platform: "google_meet",
    //     link: form.meetingLink.trim()
    //   };
    // }

    setIsSubmitting(true);

    try {
      if (serviceInfo?.mode === 'online' || paymentMethod === 'online') {
        // For online services or online payments, create order first, then payment modal
        const orderResponse = await api.post('/payment/create-order', {
          amount: serviceInfo.price,
          paymentGateway: 'fakepay',
        });

        const orderPayload = orderResponse?.data;
        setFakePayCheckout({
          appointment: null,
          orderPayload,
          serviceInfo,
          startDate: startDate.toDate(),
          endDate: endDate.toDate(),
          payload,
        });
        setIsFakePayOpen(true);
        setIsSubmitting(false);
        return;
      }

      // For cash payments (offline only), create appointment immediately

      setSuccessMessage('Appointment booked successfully.');
      setTimeout(() => navigate('/bookings', { replace: true }), 700);
    } catch (error) {
      showPopupError(error.message || 'Failed to create appointment');
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

        {submitError ? <p className="error-text">{submitError}</p> : null}
        {successMessage ? <p className="success-text">{successMessage}</p> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="form-field">
            Select Date
            <input
              type="date"
              value={selectedDate}
              min={getTodayDate()}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
            />
          </label>

          <label className="form-field">
            Available Slots

            {availableSlots.length === 0 ? (
              <p className="muted-text">No available slots for this date.</p>
            ) : (
              <select
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                required
              >
                <option value="">Select slot</option>
                
                {availableSlots.map((slot) => {
                  const value = slot.toISOString();

                  return (
                    <option key={value} value={value}>
                      {slot.local().format("h:mm A")}
                    </option>
                  );
                })}
                </select>
              )}
            </label>

          {serviceInfo?.mode === 'offline' && (
            <label className="form-field">
              Payment Method
              <div className="payment-toggle-group" style={{display: 'flex', gap: '1rem', marginTop: '0.5rem'}}>
                <button 
                  type="button" 
                  className="btn" 
                  style={{flex: 1, opacity: paymentMethod === 'cash' ? 1 : 0.6, backgroundColor: paymentMethod === 'cash' ? '#10b981' : '#6b7280'}}
                  onClick={() => setPaymentMethod('cash')}
                >
                  Pay Cash
                </button>
                <button 
                  type="button" 
                  className="btn" 
                  style={{flex: 1, opacity: paymentMethod === 'online' ? 1 : 0.6, backgroundColor: paymentMethod === 'online' ? '#10b981' : '#6b7280'}}
                  onClick={() => setPaymentMethod('online')}
                >
                  Pay Online
                </button>
              </div>
            </label>
          )}

          <label className="form-field">
            Duration
            <div className="readonly-field">
              {serviceDuration} minutes
            </div>
          </label>

          {/* <label className="form-field" htmlFor="mode">
            Mode
            <select id="mode" name="mode" value={form.mode} onChange={handleChange}>
              <option value="offline">Offline</option>
              <option value="online">Online</option>
            </select>
          </label> */}

          {/* {form.mode === "online" ? (
            <label className="form-field" htmlFor="meetingLink">
              Meeting Link
              <input
                id="meetingLink"
                name="meetingLink"
                type="url"
                value={form.meetingLink}
                onChange={handleChange}
                placeholder="https://meet.google.com/..."
                required
              />
            </label>
          ) : null} */}

          <button className="btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : (serviceInfo?.mode === 'online' || paymentMethod === 'online') ? "Pay & Book Appointment" : "Confirm Booking"}
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
          setSuccessMessage('Appointment booked and paid successfully.');
          setTimeout(() => navigate('/bookings', { replace: true }), 700);
        }}
        onCancel={() => {
          setIsFakePayOpen(false);
          setFakePayCheckout(null);
          // No appointment was created, so just close
        }}
      />
      <AlertModal isOpen={Boolean(popupMessage)} message={popupMessage} onClose={closePopup} />
    </section>
  );
}
