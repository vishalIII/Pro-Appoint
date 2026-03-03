export const parseJsonSafely = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return response.json();
};

export const formatServicePrice = (price) => {
  const value = Number(price);
  if (!Number.isFinite(value) || value < 0) return "Price on request";
  return `$${value.toFixed(2)}`;
};

export const getInitials = (name) => {
  if (!name || typeof name !== "string") return "SV";
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("")
      .slice(0, 2) || "SV"
  );
};
