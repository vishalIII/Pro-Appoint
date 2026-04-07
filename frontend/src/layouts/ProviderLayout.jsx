import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { fetchTenantShops } from "../pages/serviceProvider/api/providerApi";
import { getRangeFromPreset, getTodayIsoDate } from "../pages/serviceProvider/utils/dateRange";
import NotificationBell from "../components/NotificationBell";

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
  { to: "/tenant/notifications", label: "Notifications" },
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
  const [selectedShopId, setSelectedShopId] = useState(() => readStorage(STORAGE_KEYS.shopId, ""));
  const [rangePreset, setRangePreset] = useState(() =>
    normalizeRangePreset(readStorage(STORAGE_KEYS.rangePreset, "today")),
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

  const activeShop = useMemo(
    () => shops.find((shop) => String(shop._id) === String(selectedShopId)) || null,
    [selectedShopId, shops],
  );

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const toggleSidebar = () => setIsSidebarOpen((open) => !open);
  const closeSidebar = () => setIsSidebarOpen(false);

  useEffect(() => {
    document.body.classList.toggle("no-scroll", isSidebarOpen);
    return () => document.body.classList.remove("no-scroll");
  }, [isSidebarOpen]);

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
      <aside className={`provider-sidebar${isSidebarOpen ? " is-open" : ""}`}>
        <div className="provider-sidebar-inner">
          <div className="provider-sidebar-header">
            <span className="provider-sidebar-title">Menu</span>
            <button
              type="button"
              className="provider-sidebar-close"
              onClick={closeSidebar}
              aria-label="Close sidebar"
            >
              ×
            </button>
          </div>

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
                onClick={closeSidebar}
                className={({ isActive }) =>
                  isActive ? "provider-nav-link is-active" : "provider-nav-link"
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="provider-sidebar-footer">
            <button
              type="button"
              className="provider-logout-btn"
              onClick={() => {
                closeSidebar();
                handleLogout();
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="provider-main">
        <header className="provider-topbar">
          <div className="provider-topbar-left">
            <button
              type="button"
              className="provider-sidebar-toggle"
              aria-label="Toggle sidebar"
              aria-expanded={isSidebarOpen}
              onClick={toggleSidebar}
            >
              ☰
            </button>
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
          </div>

          <div className="provider-top-actions">
            <NotificationBell to="/tenant/notifications" />
            <span className="provider-profile-name">{user?.name || "Provider"}</span>
          </div>
        </header>

        {shopsError ? <p className="error-text">{shopsError}</p> : null}
        {activeShop ? <p className="muted-text">Active shop: {activeShop.shopName}</p> : null}

        <div className="provider-content">
          <Outlet context={outletContext} />
        </div>
      </div>

      {isSidebarOpen ? (
        <button
          type="button"
          className="provider-sidebar-backdrop"
          onClick={closeSidebar}
          aria-label="Close sidebar"
        />
      ) : null}
    </section>
  );
};

export default ProviderLayout;
