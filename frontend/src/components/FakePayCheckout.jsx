import { useEffect, useMemo, useState } from "react";
import api from "../auth/api";

const formatCurrency = (amount) => {
  if (amount == null || Number.isNaN(Number(amount))) return "₹0";
  return `₹${Number(amount).toLocaleString("en-IN")}`;
};

const generateFakePaymentSignature = async ({ orderId, paymentId }) => {
  const secret = import.meta.env.VITE_FAKEPAY_KEY_SECRET || "fakepay_test_secret";
  const encoder = new TextEncoder();
  const key = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const raw = encoder.encode(`${orderId}|${paymentId}`);
  const signature = await window.crypto.subtle.sign("HMAC", key, raw);
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const formatCardNumber = (value) =>
  value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();

const formatExpiry = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

export default function FakePayCheckout({
  isOpen,
  // appointment,
  orderPayload,
  serviceInfo,
  startDate,
  endDate,
  payload,
  shopId,
  serviceId,
  onSuccess,
  onCancel,
}) {
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

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
    setError("");
    setIsProcessing(false);
    setCardNumber("");
    setExpiry("");
    setCvv("");
  }, [isOpen]);

  const amountLabel = useMemo(
    () => formatCurrency(serviceInfo?.price),
    [serviceInfo?.price],
  );

  const handlePay = async (event) => {
    event.preventDefault();
    setError("");

    if (!cardholderName.trim()) {
      setError("Enter cardholder name.");
      return;
    }
    if (cardNumber.replace(/\s/g, "").length !== 16) {
      setError("Enter a valid 16-digit card number.");
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      setError("Enter expiration date in MM/YY format.");
      return;
    }
    if (!/^\d{3,4}$/.test(cvv)) {
      setError("Enter a valid CVV.");
      return;
    }

    if (!orderPayload?.id) {
      setError("Payment data is missing.");
      return;
    }

    setIsProcessing(true);

    try {
      // First create the appointment with pending payment
      const appointmentPayload = {
        ...payload,
        startTimeUTC: startDate.toISOString(),
        endTimeUTC: endDate.toISOString(),
        paymentMethod: 'card',
        paymentGateway: 'fakepay',
        paymentStatus: 'pending',
      };

      const appointmentResponse = await api.post(
        `/shops/${shopId}/services/${serviceId}/appointments`,
        appointmentPayload,
      );

      if (!appointmentResponse?.data?.appointment) {
        throw new Error("Failed to create appointment.");
      }

      const appointment = appointmentResponse.data.appointment;

      // Now verify the payment with appointmentId
      const paymentId = `fakepay_payment_${Date.now()}`;
      const signature = await generateFakePaymentSignature({
        orderId: orderPayload.id,
        paymentId,
      });

      const verifyResponse = await api.post("/payment/verify-payment", {
        razorpay_order_id: orderPayload.id,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        amount: serviceInfo.price,
        appointmentId: appointment._id,
        paymentGateway: "fakepay",
        paymentMethod: "card",
      });

      if (!verifyResponse?.data?.success) {
        throw new Error(verifyResponse?.data?.message || "Payment verification failed.");
      }

      onSuccess?.();
    } catch (err) {
      setError(err.message || "Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fakepay-modal-overlay${isOpen ? " is-open" : ""}`}
      onClick={onCancel}
      role="presentation"
    >
      <div
        className={`fakepay-modal${isOpen ? " is-open" : ""}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="fakepay-header">
          <div>
            {/* <p className="fakepay-logo">ProAppoint</p> */}
             <p  className="brand-logo">
                Pro<span>Appoint</span>
              </p>
            <p className="fakepay-subtitle">Secure payment powered by ProAppoint</p>
          </div>
          <div className="fakepay-status">TEST MODE</div>
        </div>

        <div className="fakepay-summary">
          <p className="fakepay-summary-label">Amount</p>
          <p className="fakepay-summary-value">{amountLabel}</p>
        </div>

        <form className="fakepay-form" onSubmit={handlePay}>
          <label className="fakepay-field">
            Cardholder name
            <input
              type="text"
              value={cardholderName}
              onChange={(event) => setCardholderName(event.target.value)}
              placeholder="manoj kumar"
              autoComplete="cc-name"
            />
          </label>

          <label className="fakepay-field">
            Card number
            <input
              type="text"
              inputMode="numeric"
              value={cardNumber}
              onChange={(event) => setCardNumber(formatCardNumber(event.target.value))}
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              autoComplete="cc-number"
            />
          </label>

          <div className="fakepay-row">
            <label className="fakepay-field fakepay-half">
              Expiry
              <input
                type="text"
                inputMode="numeric"
                value={expiry}
                onChange={(event) => setExpiry(formatExpiry(event.target.value))}
                placeholder="MM/YY"
                maxLength={5}
                autoComplete="cc-exp"
              />
            </label>
            <label className="fakepay-field fakepay-half">
              CVV
              <input
                type="password"
                inputMode="numeric"
                value={cvv}
                onChange={(event) => setCvv(event.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="123"
                maxLength={4}
                autoComplete="cc-csc"
              />
            </label>
          </div>

          {error ? <p className="fakepay-error">{error}</p> : null}

          <div className="fakepay-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button className="btn" type="submit" disabled={isProcessing}>
              {isProcessing ? "Processing..." : `Pay ${amountLabel}`}
            </button>
          </div>
        </form>

        <p className="fakepay-note">
          Use any 16-digit number and valid expiry/CVV. This is a demo payment system for booking.
        </p>
      </div>
    </div>
  );
}
