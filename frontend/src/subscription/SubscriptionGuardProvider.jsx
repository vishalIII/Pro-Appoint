import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ROLES } from "../rbac";
import { useAuth } from "../auth/useAuth";
import PlanUpgradeModal from "../components/PlanUpgradeModal";
import { fetchSubscription } from "../pages/serviceProvider/api/providerApi";
import { registerSubscriptionBlockedListener } from "./subscriptionEvents";

const SubscriptionGuardContext = createContext(null);

export const SubscriptionGuardProvider = ({ children }) => {
  const { user } = useAuth();
  const isProvider = user?.role === ROLES.PROVIDER;
  const [subscription, setSubscription] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [loadingSubscription, setLoadingSubscription] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const loadSubscription = useCallback(async () => {
    if (!isProvider) {
      setSubscription(null);
      return null;
    }

    setLoadingSubscription(true);
    try {
      const payload = await fetchSubscription();
      setSubscription(payload);
      return payload;
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      setSubscription(null);
      return null;
    } finally {
      setLoadingSubscription(false);
    }
  }, [isProvider]);

  useEffect(() => {
    if (isProvider) {
      loadSubscription();
    } else {
      setSubscription(null);
    }
  }, [isProvider, loadSubscription]);

  const isExpired = useMemo(() => {
    if (!subscription) return false;
    if (subscription.planStatus === "expired") return true;
    if (!subscription.subscriptionEnd) return false;

    return new Date(subscription.subscriptionEnd).getTime() <= Date.now();
  }, [subscription]);

  useEffect(() => {
    if (
      isProvider &&
      isExpired &&
      location.pathname !== "/tenant/subscription"
    ) {
      navigate("/tenant/subscription", { replace: true });
    }
  }, [isProvider, isExpired, location.pathname, navigate]);

  const handleBlocked = useCallback(
    (payload = {}) => {
      setModalMessage(payload.message || "");
      setIsModalOpen(true);
      loadSubscription();
    },
    [loadSubscription],
  );

  useEffect(() => registerSubscriptionBlockedListener(handleBlocked), [handleBlocked]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setModalMessage("");
  }, []);

  const handleUpgradeComplete = useCallback(() => {
    closeModal();
    loadSubscription();
  }, [closeModal, loadSubscription]);

  const contextValue = useMemo(
    () => ({ subscription, isExpired, refreshSubscription: loadSubscription, loadingSubscription }),
    [subscription, isExpired, loadSubscription, loadingSubscription],
  );

  return (
    <SubscriptionGuardContext.Provider value={contextValue}>
      {children}
      {isModalOpen ? (
        <PlanUpgradeModal
          open
          onClose={closeModal}
          subscription={subscription}
          onUpgradeComplete={handleUpgradeComplete}
          title="Upgrade to unlock write access"
          subtitle={
            modalMessage || "Your current plan has expired. Renew or upgrade to continue making changes."
          }
        />
      ) : null}
    </SubscriptionGuardContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSubscriptionGuard = () => {
  const context = useContext(SubscriptionGuardContext);
  if (!context) {
    throw new Error("useSubscriptionGuard must be used within a SubscriptionGuardProvider");
  }
  return context;
};
