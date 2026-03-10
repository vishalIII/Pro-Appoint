import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { fetchTenantAppointments, fetchTenantShops } from "../pages/serviceProvider/api/providerApi";
import { getRangeFromPreset, getTodayIsoDate } from "../pages/serviceProvider/utils/dateRange";

const STORAGE_KEYS = {
  shopId: "provider_shop_id",
  rangePreset: "provider_range_preset",
  customFrom: "provider_custom_from",
  customTo: "provider_custom_to",
};

const VALID_RANGE_PRESETS = [
  "today",
  "tomorrow",
  "upcoming",
  "past",
  "week",
  "custom",
];

const normalizeRangePreset = (value) =>
  VALID_RANGE_PRESETS.includes(value) ? value : "today";

const RANGE_PRESET_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "week", label: "This Week" },
  { value: "custom", label: "Custom Range" },
];

const navigationItems = [
  { to: "/tenant", label: "Dashboard", end: true },
  { to: "/tenant/appointments", label: "Appointments" },
  { to: "/tenant/shops", label: "Shops" },
  { to: "/tenant/services", label: "Services" },
  { to: "/tenant/resources", label: "Resources" },
  { to: "/tenant/revenue", label: "Revenue" },
  { to: "/tenant/reviews", label: "Reviews" },
  { to: "/tenant/subscription", label: "Subscription" },
  { to: "/tenant/settings", label: "Settings" },
];

const readStorage = (key, fallback = "") => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

const ProviderLayout = () => {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [shopsError, setShopsError] = useState("");
  const [notificationCount, setNotificationCount] = useState(0);
  const [selectedShopId, setSelectedShopId] = useState(() => readStorage(STORAGE_KEYS.shopId, ""));
  const [rangePreset, setRangePreset] = useState(() =>
    normalizeRangePreset(readStorage(STORAGE_KEYS.rangePreset, "today")),
  );
  const [customFrom, setCustomFrom] = useState(() =>
    readStorage(STORAGE_KEYS.customFrom, getTodayIsoDate()),
  );
  const [customTo, setCustomTo] = useState(() =>
    readStorage(STORAGE_KEYS.customTo, getTodayIsoDate()),
  );

  const effectiveRange = useMemo(
    () =>
      getRangeFromPreset({
        preset: rangePreset,
        customFrom,
        customTo,
      }),
    [customFrom, customTo, rangePreset],
  );

  const loadShops = useCallback(async () => {
    if (!token) {
      setShops([]);
      setShopsLoading(false);
      return;
    }

    setShopsLoading(true);
    setShopsError("");

    try {
      const payload = await fetchTenantShops({ token });
      const shopList = Array.isArray(payload?.shops) ? payload.shops : [];
      setShops(shopList);
    } catch (error) {
      setShops([]);
      setShopsError(error.message || "Failed to load shops");
    } finally {
      setShopsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadShops();
  }, [loadShops]);

  useEffect(() => {
    const exists =
      selectedShopId === "" || shops.some((shop) => String(shop._id) === String(selectedShopId));
    if (!exists) {
      setSelectedShopId("");
    }
  }, [selectedShopId, shops]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.shopId, selectedShopId || "");
  }, [selectedShopId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.rangePreset, rangePreset);
  }, [rangePreset]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.customFrom, customFrom || "");
  }, [customFrom]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.customTo, customTo || "");
  }, [customTo]);

  useEffect(() => {
    let isCancelled = false;

    const loadNotifications = async () => {
      if (!token) return;
      try {
        const payload = await fetchTenantAppointments({
          token,
          status: "pending",
          from: effectiveRange.from,
          to: effectiveRange.to,
        });

        if (!isCancelled) {
          setNotificationCount(Number(payload?.count || 0));
        }
      } catch {
        if (!isCancelled) {
          setNotificationCount(0);
        }
      }
    };

    loadNotifications();

    return () => {
      isCancelled = true;
    };
  }, [effectiveRange.from, effectiveRange.to, token]);

  const activeShop = useMemo(
    () => shops.find((shop) => String(shop._id) === String(selectedShopId)) || null,
    [selectedShopId, shops],
  );

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const outletContext = useMemo(
    () => ({
      shops,
      shopsLoading,
      shopsError,
      selectedShopId,
      setSelectedShopId,
      activeShop,
      rangePreset,
      setRangePreset,
      customFrom,
      setCustomFrom,
      customTo,
      setCustomTo,
      effectiveRange,
      refreshShops: loadShops,
    }),
    [
      activeShop,
      customFrom,
      customTo,
      effectiveRange,
      loadShops,
      rangePreset,
      selectedShopId,
      shops,
      shopsError,
      shopsLoading,
    ],
  );

  return (
    <section className="provider-workspace">
      <aside className="provider-sidebar">
        <div className="provider-sidebar-inner">
          <div className="provider-brand">
            <Link to="/tenant" className="provider-sidebar-logo" aria-label="Tenant dashboard">
              Pro<span>Appoint</span>
            </Link>
            <p>Booking operations</p>
          </div>

          <nav className="provider-nav">
            {navigationItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  isActive ? "provider-nav-link is-active" : "provider-nav-link"
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="provider-sidebar-footer">
            <button type="button" className="provider-logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="provider-main">
        <header className="provider-topbar">
          <div className="provider-filters">
            <label className="form-field provider-compact-field" htmlFor="provider-shop-switch">
              Shop
              <select
                id="provider-shop-switch"
                value={selectedShopId}
                onChange={(event) => setSelectedShopId(event.target.value)}
                disabled={shopsLoading}
              >
                <option value="">All shops</option>
                {shops.map((shop) => (
                  <option key={shop._id} value={shop._id}>
                    {shop.shopName}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field provider-compact-field" htmlFor="provider-range-preset">
              Range
              <select
                id="provider-range-preset"
                value={rangePreset}
                onChange={(event) => setRangePreset(event.target.value)}
              >
                {RANGE_PRESET_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {rangePreset === "custom" ? (
              <>
                <label className="form-field provider-compact-field" htmlFor="provider-custom-from">
                  From
                  <input
                    id="provider-custom-from"
                    type="date"
                    value={customFrom}
                    onChange={(event) => setCustomFrom(event.target.value)}
                  />
                </label>
                <label className="form-field provider-compact-field" htmlFor="provider-custom-to">
                  To
                  <input
                    id="provider-custom-to"
                    type="date"
                    value={customTo}
                    onChange={(event) => setCustomTo(event.target.value)}
                  />
                </label>
              </>
            ) : null}
          </div>

          <div className="provider-top-actions">
            <button type="button" className="provider-icon-btn" title="Notifications">
              <span aria-hidden="true">Bell</span>
              {notificationCount > 0 ? <span className="provider-badge">{notificationCount}</span> : null}
            </button>
            <span className="provider-profile-name">{user?.name || "Provider"}</span>
          </div>
        </header>

        {shopsError ? <p className="error-text">{shopsError}</p> : null}
        {activeShop ? <p className="muted-text">Active shop: {activeShop.shopName}</p> : null}

        <div className="provider-content">
          <Outlet context={outletContext} />
        </div>
      </div>
    </section>
  );
};

export default ProviderLayout;
