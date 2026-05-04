const defaultAllowedOrigins = [
  "http://proappoint.s3-website.ap-south-1.amazonaws.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://13.233.212.135",
  "https://13.233.212.135",
  "http://3.110.179.79",
  "https://3.110.179.79",
];

const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  ...defaultAllowedOrigins,
  ...configuredOrigins,
]);

const isAllowedOrigin = (origin) => !origin || allowedOrigins.has(origin);

const corsOriginResolver = (origin, callback) => {
  if (!origin) {
    return callback(null, true);
  }

  if (allowedOrigins.has(origin)) {
    return callback(null, origin);
  }

  return callback(new Error(`Origin ${origin} is not allowed by CORS`));
};

const applyCorsHeaders = (req, res, next) => {
  const requestOrigin = req.headers.origin;

  if (requestOrigin && allowedOrigins.has(requestOrigin)) {
    res.header("Access-Control-Allow-Origin", requestOrigin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.append("Vary", "Origin");
  }

  next();
};

module.exports = {
  allowedOrigins: Array.from(allowedOrigins),
  applyCorsHeaders,
  corsOriginResolver,
  isAllowedOrigin,
};
