import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { verifyOtpRequest, resendOtpRequest } from "../auth/authApi";

export default function VerifyOtp() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get("email");
  
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate("/register");
    }
    // Countdown for resend
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendCooldown, email, navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await verifyOtpRequest({ email, otp });
      setMessage(result.message);
      setTimeout(() => navigate("/login", { 
        state: { message: "Email verified! Please login." } 
      }), 1500);
    } catch (err) {
      // Safe error extraction from axios/backend
      const errorMsg = err.response?.data?.message || err.message || "Verification failed. Please try again.";
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendOtpRequest({ email });
      setMessage("New OTP sent!");
      setCanResend(false);
      setResendCooldown(30);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || "Failed to resend OTP";
      setError(errorMsg);
    }
  };

  if (!email) return null;

  return (
    <section className="auth-page">
      <div className="card auth-card">
        <h1>Verify OTP</h1>
        <p>Check your email: <strong>{email}</strong></p>
        
        {message ? <p className="success-text">{message}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        <form className="auth-form" onSubmit={handleVerify}>
          <label className="form-field" htmlFor="otp">
            Enter 6-digit OTP
            <input
              id="otp"
              name="otp"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.slice(0, 6))}
              maxLength={6}
              pattern="[0-9]{6}"
              required
              autoFocus
            />
          </label>

          <button className="btn" type="submit" disabled={isSubmitting || otp.length !== 6}>
            {isSubmitting ? "Verifying..." : "Verify OTP"}
          </button>
        </form>

        <button 
          className="btn btn-secondary" 
          onClick={handleResend}
          disabled={!canResend || isSubmitting}
        >
          {canResend ? "Resend OTP" : `Resend in ${resendCooldown}s`}
        </button>

        <p><a href="/login">Back to Login</a></p>
      </div>
    </section>
  );
}

