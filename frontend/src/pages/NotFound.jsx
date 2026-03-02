import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="page-block">
      <div className="card">
        <h1>Page Not Found</h1>
        <Link to="/">Return to Home</Link>
      </div>
    </section>
  );
}
