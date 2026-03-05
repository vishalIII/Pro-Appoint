const PLAN_LIMITS = Object.freeze({
  basic: {
    maxShops: 1,
    maxServicesPerShop: 25,
    maxResourcesPerShop: 25,
  },
  pro: {
    maxShops: 2,
    maxServicesPerShop: 100,
    maxResourcesPerShop: 100,
  },
  enterprise: {
    maxShops: 3,
    maxServicesPerShop: null,
    maxResourcesPerShop: null,
  },
});

const DEFAULT_PLAN = "basic";

const getPlanLimits = (plan) => PLAN_LIMITS[plan] || PLAN_LIMITS[DEFAULT_PLAN];

module.exports = {
  PLAN_LIMITS,
  DEFAULT_PLAN,
  getPlanLimits,
};
