import PlanUpgradePanel from "./PlanUpgradePanel";

export default function PlanUpgradeModal({
  open,
  onClose,
  subscription,
  onUpgradeComplete,
}) {
  if (!open) return null;

  const handleSuccess = (payload) => {
    if (onUpgradeComplete) {
      onUpgradeComplete(payload);
    }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose}>
          ×
        </button>
        <PlanUpgradePanel
          prefetchedSubscription={subscription}
          onSuccess={handleSuccess}
          onError={() => {}}
          showHeader
          title="Upgrade your subscription"
          subtitle="Choose the next plan and keep your business running"
        />
      </div>

      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          z-index: 100;
        }
        .modal-panel {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #fff;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          z-index: 101;
          width: min(600px, 90vw);
        }
        .modal-close {
          position: absolute;
          top: 0.25rem;
          right: 0.5rem;
          border: none;
          background: transparent;
          font-size: 1.25rem;
          cursor: pointer;
        }
      `}</style>
    </>
  );
}
