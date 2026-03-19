const STATUS_CLASS_MAP = {
  pending: "is-pending",

  confirmed: "is-confirmed",

  completed: "is-completed",
  auto_completed: "is-completed",
  manual_completed: "is-completed",

  cancelled: "is-cancelled",
  cancelled_late: "is-cancelled",
  provider_cancelled: "is-cancelled",
  customer_cancelled: "is-cancelled",
  system_cancelled: "is-cancelled",
  rejected: "is-cancelled",

  no_show: "is-noshow",
  provider_no_show: "is-noshow",
  customer_no_show: "is-noshow",
  both_no_show: "is-noshow",
};

export default function StatusPill({ value }) {
  const normalized = String(value || "").toLowerCase();

  const className = STATUS_CLASS_MAP[normalized] || "is-neutral";

  const label = normalized
    ? normalized.replaceAll("_", " ")
    : "N/A";

  return (
    <span className={`provider-status-pill ${className}`}>
      {label}
    </span>
  );
}