import { useEffect } from "react";

export default function AlertModal({
  isOpen,
  message,
  onClose,
  okLabel = "OK",
  closeOnOverlayClick = true
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  return (
    <div
      className={`alert-modal-overlay${isOpen ? " is-open" : ""}`}
      onClick={isOpen && closeOnOverlayClick ? onClose : undefined}
      role="presentation"
      aria-hidden={!isOpen}
    >
      <div
        className={`alert-modal${isOpen ? " is-open" : ""}`}
        role="alertdialog"
        aria-modal="true"
        aria-live="assertive"
        aria-hidden={!isOpen}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="alert-modal-message">{message || "Something went wrong. Please try again."}</p>
        <button className="btn alert-modal-ok" type="button" onClick={onClose}>
          {okLabel}
        </button>
      </div>
    </div>
  );
}
