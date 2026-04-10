import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginRequest } from "../auth/authApi";
import { useAuth } from "../auth/useAuth";
import { ROLES, getDashboardPathForRole } from "../rbac";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const successMessage = location.state?.message || "";
  const redirectTo = location.state?.redirectTo || null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
  event.preventDefault();
  setError("");
  setIsSubmitting(true);

  try {
    const data = await loginRequest(form);

    if (!data.user.isVerified) {
      navigate(`/verify-otp?email=${encodeURIComponent(form.email)}`, {
        replace: true,
        state: { message: "Please verify your email first" }
      });
      return;
    }

    // ✅ FIX: store accessToken correctly
    login({ user: data.user, token: data.accessToken });

    if (data.user?.role === ROLES.PROVIDER) {
      navigate("/tenant", { replace: true });
    } else {
      navigate(
        redirectTo || getDashboardPathForRole(data.user?.role),
        { replace: true }
      );
    }
  } catch (submissionError) {
    setError(submissionError.message || "Unable to login");
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <section className="auth-page">
      <div className="card auth-card">
        <h1>Login</h1>
        {successMessage ? <p className="success-text">{successMessage}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="form-field" htmlFor="email">
            Email
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>

          <label className="form-field" htmlFor="password">
            Password
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>

          <button className="btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Login"}
          </button>
        </form>

        <p>
          New user? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </section>
  );
}
