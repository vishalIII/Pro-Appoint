const STATUS_CLASS_MAP = {
  pending: "is-pending",
  confirmed: "is-confirmed",
  completed: "is-completed",
  cancelled: "is-cancelled",
  cancelled_late: "is-cancelled",
  rejected: "is-cancelled",
  no_show: "is-noshow",
  paid: "is-completed",
  refunded: "is-cancelled",
  failed: "is-cancelled",
  active: "is-completed",
  inactive: "is-cancelled",
};

export default function StatusPill({ value }) {
  const normalized = String(value || "").toLowerCase();
  const className = STATUS_CLASS_MAP[normalized] || "is-neutral";
  const label = normalized ? normalized.replaceAll("_", " ") : "n/a";

  return <span className={`provider-status-pill ${className}`}>{label}</span>;
}
