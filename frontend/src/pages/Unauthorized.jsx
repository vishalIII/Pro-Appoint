import { Link } from "react-router-dom";

export default function Unauthorized() {
  return (
    <section className="page-block">
      <div className="card">
        <h1>Unauthorized</h1>
        <p>You do not have permission to access this page.</p>
        <Link to="/">Go back home</Link>
      </div>
    </section>
  );
}
