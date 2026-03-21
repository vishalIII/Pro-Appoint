const TRANSFORM_SEGMENT = "f_auto,q_auto,w_500";

export const applyCloudinaryTransform = (url) => {
  if (!url || typeof url !== "string") return url || "";

  const marker = "/upload/";
  const index = url.indexOf(marker);

  if (index === -1) return url;

  const afterMarker = url.slice(index + marker.length);
  if (afterMarker.startsWith(`${TRANSFORM_SEGMENT}/`)) {
    return url;
  }

  return `${url.slice(0, index + marker.length)}${TRANSFORM_SEGMENT}/${afterMarker}`;
};

export const formatBytes = (bytes) => {
  if (!bytes || Number.isNaN(bytes)) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};
