import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginRequest } from "../auth/authApi";
import { useAuth } from "../auth/useAuth";
import { getDashboardPathForRole } from "../auth/permissions";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const successMessage = location.state?.message || "";

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
      login({ user: data.user, token: data.token });
      navigate(getDashboardPathForRole(data.user?.role), { replace: true });
    } catch (submissionError) {
      setError(submissionError.message || "Unable to login");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section>
      <h1>Login</h1>
      {successMessage ? <p>{successMessage}</p> : null}
      {error ? <p>{error}</p> : null}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </form>

      <p>
        New user? <Link to="/register">Create an account</Link>
      </p>
    </section>
  );
}
