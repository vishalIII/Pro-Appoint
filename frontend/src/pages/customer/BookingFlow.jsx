import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import AlertModal from "../../components/AlertModal";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";


const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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

const parseTimeOnDateLocal = (date, timeText) => {
  const match = typeof timeText === "string" ? timeText.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/) : null;
  if (!match) return null;

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    Number(match[1]),
    Number(match[2]),
    0,
    0
  );
};

// const getMinStartTimeLocal = () => {
//   const now = new Date();
//   now.setSeconds(0, 0);
//   return toLocalDateTimeValue(now);
// };

const getDayNameLocal = (date) => {
  const dayNames = [
    "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"
  ];
  return dayNames[date.getDay()];
};

const normalizeShopSchedule = (payload) => ({
  weeklyAvailability: Array.isArray(payload?.weeklyAvailability) ? payload.weeklyAvailability : [],
  closedPeriods: Array.isArray(payload?.closedPeriods) ? payload.closedPeriods : []
});

const normalizeServiceSchedule = (payload) => ({
  weeklyAvailability: Array.isArray(payload?.weeklyAvailability) ? payload.weeklyAvailability : [],
  closedPeriods: Array.isArray(payload?.closedPeriods) ? payload.closedPeriods : []
});

const isClosedForDateRange = ({ bookingDate, closedPeriods }) => {
  if (!Array.isArray(closedPeriods) || closedPeriods.length === 0) {
    return false;
  }

  const dayStart = new Date(
    bookingDate.getFullYear(),
    bookingDate.getMonth(),
    bookingDate.getDate(),
    0,
    0,
    0,
    0
  );
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  return closedPeriods.some((period) => {
    const periodStart = new Date(period?.startDate);
    const periodEnd = new Date(period?.endDate);
    if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
      return false;
    }
    return dayStart < periodEnd && dayEnd > periodStart;
  });
};

const getDayAvailability = (schedule, bookingDate) => {
  if (!schedule) return null;
  const dayName = getDayNameLocal(bookingDate);
  return (
    schedule.weeklyAvailability.find(
      (entry) =>
        typeof entry?.day === "string" &&
        entry.day.toLowerCase() === dayName
    ) || null
  );
};

const isSameLocalDate = (left, right) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

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

const getDayRangesOnDateLocal = ({ bookingDate, dayAvailability }) => {
  if (!dayAvailability) return [];

  const ranges = [];
  const slotList = Array.isArray(dayAvailability.slots) ? dayAvailability.slots : [];

  for (const slot of slotList) {
    const startCandidate = slot?.startTime ?? slot?.start;
    const endCandidate = slot?.endTime ?? slot?.end;
    const windowStart = parseTimeOnDateLocal(bookingDate, startCandidate);
    const windowEnd = parseTimeOnDateLocal(bookingDate, endCandidate);

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
    const rangeStart = parseTimeOnDateLocal(bookingDate, rangeStartText);
    const rangeEnd = parseTimeOnDateLocal(bookingDate, rangeEndText);
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

  if (!isSameLocalDate(bookingStart, bookingEnd)) {
    return "Booking time is outside shop working hours.";
  }

  if (isScheduleClosedByDateRange({ schedule: shopSchedule, bookingDate: bookingStart })) {
    return "Shop is closed on selected day.";
  }

  const shopDayAvailability = getDayAvailability(shopSchedule, bookingStart);
  if (!isDayOpen(shopDayAvailability)) {
    return "Shop is closed on selected day.";
  }

  const shopRanges = getDayRangesOnDateLocal({
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

  const serviceRanges = getDayRangesOnDateLocal({
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

const mapServerErrorToPopupMessage = ({ rawMessage, shopSchedule, serviceSchedule, bookingStart, bookingEnd }) => {
  const message = String(rawMessage || "").trim();
  const normalized = message.toLowerCase();

  if (
    normalized.includes("shop is closed on selected day") ||
    normalized.includes("booking time is outside shop working hours") ||
    normalized.includes("service is not available at selected time")
  ) {
    return message;
  }

  if (normalized.includes("outside service availability")) {
    return (
      getAvailabilityPopupMessage({
        shopSchedule,
        serviceSchedule,
        bookingStart,
        bookingEnd
      }) || "Selected slot is not available."
    );
  }

  if (
    normalized.includes("no longer available") ||
    normalized.includes("time slot already booked")
  ) {
    return "Time slot already booked.";
  }

  if (normalized.includes("cannot book an appointment in the past")) {
    return "Please select current or future date and time.";
  }

  return message || "Failed to create appointment";
};


export default function BookingFlow() {
  const { shopId, serviceId } = useParams();
  const { token } = useAuth();
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


  useEffect(() => {
    if (!shopId || !serviceId || !selectedDate || !serviceDuration) return;

    const controller = new AbortController();

    const fetchSlots = async () => {
      setSubmitError("");   // reset previous error
      setAvailableSlots([]);
      setSelectedSlot("");

      const tzOffsetMinutes = new Date().getTimezoneOffset();

      try {
        const response = await fetch(
          `${API_BASE_URL}/shops/${shopId}/services/${serviceId}/slots?date=${selectedDate}&slotIntervalMinutes=${serviceDuration}&tzOffsetMinutes=${tzOffsetMinutes}`,
          { signal: controller.signal }
        );

        const payload = await parseJsonSafely(response);

        if (!response.ok || !payload) {
          throw new Error(payload?.message || "Failed to load available slots");
        }
        const rawSlots = Array.isArray(payload.slots) ? payload.slots : [];

        console.log(rawSlots)



        const slots = rawSlots
          .map((slot) => {
            if (!slot?.startTimeUTC) return null;

            const date = new Date(slot.startTimeUTC);
            return date;
          })
          .filter(Boolean)
          .filter((slot) => {
           
            const localDateStr = slot.toLocaleDateString("en-CA");
   
            if (localDateStr !== selectedDate) return false;

            const now = new Date();
            if (selectedDate === getTodayDate()) {
              return slot.getTime() > now.getTime();
            }

            return true;
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
    const startDate = new Date(selectedSlot);
    const duration = serviceDuration;

    if (Number.isNaN(startDate.getTime())) {
      setSubmitError("Please select a valid start date and time.");
      return;
    }

    if (!Number.isFinite(duration) || duration <= 0) {
      setSubmitError("Duration must be greater than 0.");
      return;
    }

    const now = new Date();
    if (startDate.getTime() <= now.getTime()) {
      showPopupError("Please select current or future date and time.");
      return;
    }

    const endDate = new Date(startDate.getTime() + duration * 60000);

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
      bookingStart: startDate,
      bookingEnd: endDate
    });

    if (availabilityPopupMessage) {
      showPopupError(availabilityPopupMessage);
      return;
    }

    const payload = {
      startTimeUTC: startDate.toISOString(),
      endTimeUTC: endDate.toISOString(),
      tzOffsetMinutes: new Date().getTimezoneOffset(),
    };

    // if (form.mode === "online") {
    //   payload.meeting = {
    //     platform: "google_meet",
    //     link: form.meetingLink.trim()
    //   };
    // }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/shops/${shopId}/services/${serviceId}/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const responsePayload = await parseJsonSafely(response);

      if (!response.ok) {
        const mappedMessage = mapServerErrorToPopupMessage({
          rawMessage: responsePayload?.message,
          shopSchedule: selectedShopSchedule,
          serviceSchedule: selectedServiceSchedule,
          bookingStart: startDate,
          bookingEnd: endDate
        });
        throw new Error(mappedMessage);
      }

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
                      {slot.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true
                      })}
                    </option>
                  );
                })}
              </select>
            )}
          </label>

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
            {isSubmitting ? "Booking..." : "Confirm Booking"}
          </button>
        </form>
      </div>

      <AlertModal isOpen={Boolean(popupMessage)} message={popupMessage} onClose={closePopup} />
    </section>
  );
}
