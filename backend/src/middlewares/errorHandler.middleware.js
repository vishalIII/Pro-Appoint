module.exports = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : "Internal Server Error";

  if (!err.isOperational) {
    console.error("💥 UNEXPECTED ERROR:", err);
  }

  const responsePayload = {
    success: false,
    message,
  };

  if (err.code) {
    responsePayload.code = err.code;
  }

  res.status(statusCode).json(responsePayload);
};
