const trimTrailingSlash = (value) => value?.replace(/\/+$/, "");

const browserOrigin =
  typeof window !== "undefined" ? window.location.origin : "";

const browserHostname =
  typeof window !== "undefined" ? window.location.hostname : "";

const DEFAULT_DEPLOYED_BACKEND_ORIGIN = "http://3.110.179.79";

const deployedBackendOrigin =
  trimTrailingSlash(import.meta.env.VITE_DEPLOYED_BACKEND_ORIGIN) ||
  (browserHostname.includes(".s3-website.")
    ? DEFAULT_DEPLOYED_BACKEND_ORIGIN
    : browserOrigin);

const defaultApiBaseUrl =
  deployedBackendOrigin && deployedBackendOrigin !== browserOrigin
    ? `${deployedBackendOrigin}/api`
    : "/api";

export const API_BASE_URL =
  trimTrailingSlash(import.meta.env.VITE_API_BASE_URL) || defaultApiBaseUrl;

export const SOCKET_BASE_URL =
  trimTrailingSlash(import.meta.env.VITE_SOCKET_BASE_URL) ||
  deployedBackendOrigin ||
  browserOrigin;
