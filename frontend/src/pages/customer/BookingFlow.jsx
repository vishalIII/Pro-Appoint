import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const toLocalDateTimeValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const parseJsonSafely = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return response.json();
};

export default function BookingFlow() {
  const { shopId, serviceId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const defaultStartTime = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 60);
    now.setSeconds(0, 0);
    return toLocalDateTimeValue(now);
  }, []);

  const [form, setForm] = useState({
    startTimeLocal: defaultStartTime,
    durationMinutes: 30,
    mode: "offline",
    meetingLink: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setSuccessMessage("");

    const startDate = new Date(form.startTimeLocal);
    const duration = Number(form.durationMinutes);

    if (Number.isNaN(startDate.getTime())) {
      setSubmitError("Please select a valid start date and time.");
      return;
    }

    if (!Number.isFinite(duration) || duration <= 0) {
      setSubmitError("Duration must be greater than 0.");
      return;
    }

    if (form.mode === "online" && !form.meetingLink.trim()) {
      setSubmitError("Meeting link is required for online appointments.");
      return;
    }

    const endDate = new Date(startDate.getTime() + duration * 60000);

    const payload = {
      startTimeUTC: startDate.toISOString(),
      endTimeUTC: endDate.toISOString(),
      mode: form.mode
    };

    if (form.mode === "online") {
      payload.meeting = {
        platform: "google_meet",
        link: form.meetingLink.trim()
      };
    }

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
        throw new Error(responsePayload?.message || "Failed to create appointment");
      }

      setSuccessMessage("Appointment booked successfully.");
      setTimeout(() => navigate("/customer/bookings", { replace: true }), 700);
    } catch (error) {
      setSubmitError(error.message || "Failed to create appointment");
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
          <label className="form-field" htmlFor="startTimeLocal">
            Start Time
            <input
              id="startTimeLocal"
              type="datetime-local"
              name="startTimeLocal"
              value={form.startTimeLocal}
              onChange={handleChange}
              required
            />
          </label>

          <label className="form-field" htmlFor="durationMinutes">
            Duration (minutes)
            <input
              id="durationMinutes"
              type="number"
              min="1"
              name="durationMinutes"
              value={form.durationMinutes}
              onChange={handleChange}
              required
            />
          </label>

          <label className="form-field" htmlFor="mode">
            Mode
            <select id="mode" name="mode" value={form.mode} onChange={handleChange}>
              <option value="offline">Offline</option>
              <option value="online">Online</option>
            </select>
          </label>

          {form.mode === "online" ? (
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
          ) : null}

          <button className="btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Booking..." : "Confirm Booking"}
          </button>
        </form>
      </div>
    </section>
  );
}
