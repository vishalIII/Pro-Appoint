module.exports = (err, req, res, next) => {
  // Default values
  const statusCode = err.statusCode || 500;
  const message = err.isOperational
    ? err.message
    : "Internal Server Error";

  // Optional: log unexpected errors
  if (!err.isOperational) {
    console.error("💥 UNEXPECTED ERROR:", err);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};
