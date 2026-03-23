import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { fetchWalletBalance, fetchWalletTransactions, topupWallet } from "./api/providerApi";

const formatCurrency = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));

export default function ProviderWalletPage() {
  const { token } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topupLoading, setTopupLoading] = useState(false);
  const [error, setError] = useState("");

  const loadWalletData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [balanceRes, transRes] = await Promise.all([
        fetchWalletBalance({ token }),
        fetchWalletTransactions({ token }),
      ]);
      setBalance(balanceRes?.data?.balance || 0);
      setTransactions(transRes?.data?.transactions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadWalletData();
  }, [loadWalletData]);

  const handleTopup = async (amount) => {
    if (!token) return;
    try {
      setTopupLoading(true);
      setError("");
      await topupWallet({ token, amount });
      await loadWalletData();
    } catch (err) {
      setError(err.message);
    } finally {
      setTopupLoading(false);
    }
  };

  if (loading) return <div className="provider-page"><p>Loading wallet...</p></div>;

  return (
    <section className="provider-page">
      <article className="card">
        <h1>Virtual Wallet (Demo)</h1>
        {error && <p className="error-text">{error}</p>}
        <div className="provider-kpi-grid" style={{ maxWidth: "400px", margin: "0 auto 2rem" }}>
          <div>
            <p>Available Balance</p>
            <h2>{formatCurrency(balance)}</h2>
          </div>
        </div>
        <div className="actions-row" style={{ justifyContent: "center", gap: "1rem" }}>
          {[100, 500, 1000].map((amt) => (
            <button
              key={amt}
              className="btn"
              onClick={() => handleTopup(amt)}
              disabled={topupLoading}
            >
              {topupLoading ? "..." : `+ ₹${amt}`}
            </button>
          ))}
        </div>
        <p className="muted-text" style={{ textAlign: "center", marginTop: "1rem" }}>
          Demo top-ups. Balance used for marking payments as paid from wallet.
        </p>
      </article>

      <article className="card">
        <h2>Recent Transactions</h2>
        {transactions.length === 0 ? (
          <p className="muted-text">No transactions yet.</p>
        ) : (
          <div className="provider-table-wrap">
            <table className="provider-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Balance</th>
                  <th>Ref</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx._id}>
                    <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
                    <td>
                      <StatusPill 
                        value={tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} 
                        className={`is-${tx.type === 'topup' ? 'positive' : 'negative'}`} 
                      />
                    </td>
                    <td>{formatCurrency(tx.amount)}</td>
                    <td>{formatCurrency(tx.balanceAfter)}</td>
                    <td>{tx.referenceId?.slice(-6) || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
