import { useNavigate } from "react-router-dom";
import SearchBar from "../../../../components/SearchBar";

export default function HeroSection() {
  const navigate = useNavigate();

  const handleSearch = ({ service, location }) => {
    const cleanService = service?.trim() || "";
    const cleanLocation = location?.trim() || "";

    const query = `${cleanService} ${cleanLocation}`.trim();

    const params = new URLSearchParams();
    if (cleanService) params.set("service", cleanService);
    if (cleanLocation) params.set("location", cleanLocation);
    if (query) params.set("q", query);

    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className="hero-column">
      <div className="search-support-row">
        <SearchBar onSearch={handleSearch} buttonLabel="Search" />
      </div>

      <article className="hero-banner">
        <div className="hero-copy">
          <p className="hero-eyebrow">BOOK EASY</p>
          <h1>
            Professional
            <br />
            100% Trusted
          </h1>
          <p>Instant Confirmation Available</p>

          <div className="hero-actions">
            <button className="btn btn-ogani" type="button" onClick={() => navigate("/search")}>Search services</button>
            <button className="btn btn-secondary" type="button" onClick={() => navigate("/reviews")}>Read Reviews</button>
          </div>
        </div>
      </article>
    </div>
  );
}

