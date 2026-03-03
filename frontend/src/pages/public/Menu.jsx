import { Shops } from "./shop/Shops";

export default function Menu() {
  return (
    <>
      <section className="page-block menu-page">
        <div className="card menu-banner">
          <h1>Shop Directory</h1>
          <p>
            Explore available shops and open any listing to view service details and booking options.
          </p>
        </div>
      </section>

      <Shops
        title="Public Menu"
        subtitle="Select a shop to view available services and service details."
      />
    </>
  );
}
