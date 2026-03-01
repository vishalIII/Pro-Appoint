import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerRequest } from "../auth/authApi";
import { ROLES } from "../auth/permissions";

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
    <section>
      <h1>Register</h1>
      {error ? <p>{error}</p> : null}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" value={form.name} onChange={handleChange} required />
        </div>
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
            minLength={6}
            required
          />
        </div>
        <div>
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            minLength={6}
            required
          />
        </div>
        <div>
          <label htmlFor="role">Role</label>
          <select id="role" name="role" value={form.role} onChange={handleChange}>
            <option value={ROLES.CUSTOMER}>Customer</option>
            <option value={ROLES.PROVIDER}>Service Provider</option>
          </select>
        </div>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Register"}
        </button>
      </form>
      <p>
        Already registered? <Link to="/login">Go to login</Link>
      </p>
    </section>
  );
}
