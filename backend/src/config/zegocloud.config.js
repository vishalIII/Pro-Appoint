module.exports = {
  appId: Number(process.env.ZEGO_APP_ID) || 0,
  serverSecret: process.env.ZEGO_SERVER_SECRET || "",
  defaultTtlSeconds: Number(process.env.ZEGO_TOKEN_TTL_SECONDS) || 7200,
};
