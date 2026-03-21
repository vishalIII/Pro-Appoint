const { verifyWebhookSignature } = require('../../utils/zegocloud');
const AppError = require('../../utils/appError');

/**
 * Middleware to verify ZEGOCLOUD webhook signature
 * Expects rawBody available via req.rawBody (use express.raw() upstream)
 */
const verifyZegoWebhook = (req, res, next) => {
  const signature = req.headers['x-zego-server-sign'] || req.headers['x-zego-server-signature'];
  const rawBody = req.rawBody || '';

  if (!signature) {
    return next(new AppError('Missing ZEGOCLOUD signature header (X-Zego-Server-Sign)', 401));
  }

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn(`ZEGOCLOUD webhook signature mismatch for room: ${req.body?.room_id}`);
    return next(new AppError('Invalid webhook signature', 401));
  }

  next();
};

module.exports = verifyZegoWebhook;

