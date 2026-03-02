import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerRequest } from "../auth/authApi";
import { ROLES } from "../rbac";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: ROLES.CUSTOMER
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      await registerRequest({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role
      });

      navigate("/login", {
        replace: true,
        state: { message: "Registration successful. Please login." }
      });
    } catch (submissionError) {
      setError(submissionError.message || "Unable to register");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-page">
      <div className="card auth-card">
        <h1>Register</h1>
        {error ? <p className="error-text">{error}</p> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="form-field" htmlFor="name">
            Name
            <input id="name" name="name" value={form.name} onChange={handleChange} required />
          </label>

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
              minLength={6}
              required
            />
          </label>

          <label className="form-field" htmlFor="confirmPassword">
            Confirm Password
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              minLength={6}
              required
            />
          </label>

          <label className="form-field" htmlFor="role">
            Role
            <select id="role" name="role" value={form.role} onChange={handleChange}>
              <option value={ROLES.CUSTOMER}>Customer</option>
              <option value={ROLES.PROVIDER}>Service Provider</option>
            </select>
          </label>

          <button className="btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Register"}
          </button>
        </form>

        <p>
          Already registered? <Link to="/login">Go to login</Link>
        </p>
      </div>
    </section>
  );
}
