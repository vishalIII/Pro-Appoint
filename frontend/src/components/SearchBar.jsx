import { useEffect, useState } from "react";

export default function SearchBar({
  initialService = "",
  initialLocation = "",
  buttonLabel = "Search",
  onSearch,
}) {
  const [service, setService] = useState(initialService);
  const [location, setLocation] = useState(initialLocation);

  useEffect(() => {
    setService(initialService);
    setLocation(initialLocation);
  }, [initialService, initialLocation]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!service.trim() && !location.trim()) {
      return;
    }

    onSearch({
      service: service.trim(),
      location: location.trim(),
    });
  };

  return (
    <form className="search-bar-form" onSubmit={handleSubmit}>
      <input
        type="text"
        value={service}
        onChange={(event) => setService(event.target.value)}
        placeholder="Service name / category"
        aria-label="Service name or category"
      />
      <input
        type="text"
        value={location}
        onChange={(event) => setLocation(event.target.value)}
        placeholder="Location (city)"
        aria-label="Location city"
      />
      <button type="submit" className="btn btn-ogani">
        {buttonLabel}
      </button>
    </form>
  );
}
