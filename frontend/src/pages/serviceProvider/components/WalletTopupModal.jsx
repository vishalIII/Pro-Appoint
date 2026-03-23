import { useState } from "react";
import StatusPill from "./StatusPill";

const WalletTopupModal = ({ isOpen, onClose, onTopup }) => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = +amount;
    if (numAmount >= 10) {
      onTopup(numAmount);
      setAmount("");
    }
  };

  const quickTopups = [100, 500, 1000];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <header>
          <h3>Top-up Wallet (Demo)</h3>
          <button className="btn btn-small btn-icon" onClick={onClose}>×</button>
        </header>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="10"
              placeholder="Minimum ₹10"
              required
            />
          </div>
          <div className="actions-row">
            {quickTopups.map((amt) => (
              <button
                key={amt}
                type="button"
                className="btn btn-small"
                onClick={() => {
                  setAmount(amt.toString());
                  handleSubmit({ preventDefault: () => {} });
                }}
              >
                +{amt}
              </button>
            ))}
            <button type="submit" className="btn" disabled={loading}>
              {loading ? "..." : "Top-up"}
            </button>
          </div>
        </form>
        <p className="muted-text small">Demo: No real payment. Balance updates instantly.</p>
      </div>
    </div>
  );
};

export default WalletTopupModal;

