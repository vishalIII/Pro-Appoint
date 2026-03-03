export default function About() {
  return (
    <section className="page-block about-page">
      <div className="card about-hero">
        <p className="about-kicker">About FreshMart</p>
        <h1>Local service discovery with a clean customer-to-provider flow.</h1>
        <p>
          The platform helps users find verified shops, explore services, and book quickly while supporting
          provider onboarding and role-based access for operations.
        </p>
      </div>

      <div className="about-grid">
        <article className="card about-tile">
          <h3>Customer First</h3>
          <p>Browse shops, compare options, and complete bookings with fewer steps.</p>
        </article>
        <article className="card about-tile">
          <h3>Provider Growth</h3>
          <p>Apply as a service provider, manage offerings, and scale with subscription plans.</p>
        </article>
        <article className="card about-tile">
          <h3>Secure Access</h3>
          <p>Role-based permissions keep customer, provider, and admin workflows separated.</p>
        </article>
      </div>
    </section>
  );
}
