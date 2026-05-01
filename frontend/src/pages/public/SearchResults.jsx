import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SearchBar from "../../components/SearchBar";
import SearchCard from "../../components/SearchCard";
import { searchServices } from "../../api/searchApi";

// ----------------------
// HELPERS
// ----------------------
const makeParams = (searchParams) => ({
    q: searchParams.get("q") || "",
    service: searchParams.get("service") || "",
    location: searchParams.get("location") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    minRating: searchParams.get("minRating") || "",
    sort: searchParams.get("sort") || "lowestPrice",
    page: Number(searchParams.get("page") || 1),
    limit: Number(searchParams.get("limit") || 12),
});

const buildSearchQuery = (params) => {
    const result = {};
    Object.entries(params).forEach(([key, value]) => {
        if (value !== "" && value !== undefined && value !== null) {
            result[key] = value;
        }
    });
    return result;
};

export default function SearchResults() {
    const [searchParams, setSearchParams] = useSearchParams();

    const [results, setResults] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [filters, setFilters] = useState({
        minPrice: "",
        maxPrice: "",
        minRating: "",
        sort: "lowestPrice",
    });

    const params = useMemo(() => makeParams(searchParams), [searchParams]);

    // sync filters with URL
    useEffect(() => {
        setFilters({
            minPrice: params.minPrice,
            maxPrice: params.maxPrice,
            minRating: params.minRating,
            sort: params.sort,
        });
    }, [searchParams]);

    // ----------------------
    // FETCH DATA
    // ----------------------
    useEffect(() => {
        const fetchResults = async () => {
            if (!params.q && !params.service) {
                setResults([]);
                setTotal(0);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const data = await searchServices(buildSearchQuery(params));
                setResults(data.results || []);
                setTotal(data.total || 0);
            } catch (err) {
                setError(
                    err?.response?.data?.message ||
                    err.message ||
                    "Unable to load search results."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [params]);

    // ----------------------
    // HANDLERS
    // ----------------------
    const handleSearch = ({ service, location }) => {
        const cleanService = service?.trim() || "";
        const cleanLocation = location?.trim() || "";

        const query = `${cleanService} ${cleanLocation}`.trim();

        setSearchParams({
            service: cleanService,
            location: cleanLocation,
            q: query,
            sort: filters.sort,
            minPrice: filters.minPrice,
            maxPrice: filters.maxPrice,
            minRating: filters.minRating,
            page: 1,
            limit: params.limit,
        });
    };

    const handleFiltersSubmit = (e) => {
        e.preventDefault();

        const query = `${params.service} ${params.location}`.trim();

        setSearchParams({
            service: params.service,
            location: params.location,
            q: query,
            sort: filters.sort,
            minPrice: filters.minPrice,
            maxPrice: filters.maxPrice,
            minRating: filters.minRating,
            page: 1,
            limit: params.limit,
        });
    };

    const handlePageChange = (newPage) => {
        const query = `${params.service} ${params.location}`.trim();

        setSearchParams({
            service: params.service,
            location: params.location,
            q: query,
            sort: params.sort,
            minPrice: params.minPrice,
            maxPrice: params.maxPrice,
            minRating: params.minRating,
            page: newPage,
            limit: params.limit,
        });
    };

    const totalPages = Math.max(1, Math.ceil(total / params.limit));

    // ----------------------
    // UI
    // ----------------------
    return (
        
        <main className="search-page page-shell">
            <section className="search-hero">
                <div className="search-hero-copy">
                    <h1>Find the perfect service for your city</h1>
                    <p>
                        Search shops and services by category, location, price, and rating.
                    </p>
                </div>

                <SearchBar
                    initialService={params.service}
                    initialLocation={params.location}
                    onSearch={handleSearch}
                    buttonLabel="Search"
                />
            </section>

            {/* FILTERS */}
            <section className="search-filters-panel">
                <form className="search-filters-form" onSubmit={handleFiltersSubmit}>
                    <div className="search-filter-field">
                        <label htmlFor="sort">Sort</label>
                        <select
                            id="sort"
                            value={filters.sort}
                            onChange={(e) =>
                                setFilters((prev) => ({ ...prev, sort: e.target.value }))
                            }
                        >
                            <option value="lowestPrice">Lowest price</option>
                            <option value="highestRating">Highest rating</option>
                        </select>
                    </div>

                    <div className="search-filter-field">
                        <label htmlFor="minPrice">Min price</label>
                        <input
                            id="minPrice"
                            type="number"
                            placeholder="0"
                            value={filters.minPrice}
                            onChange={(e) =>
                                setFilters((prev) => ({ ...prev, minPrice: e.target.value }))
                            }
                        />
                    </div>

                    <div className="search-filter-field">
                        <label htmlFor="maxPrice">Max price</label>
                        <input
                            id="maxPrice"
                            type="number"
                            placeholder="9999"
                            value={filters.maxPrice}
                            onChange={(e) =>
                                setFilters((prev) => ({ ...prev, maxPrice: e.target.value }))
                            }
                        />
                    </div>

                    <div className="search-filter-field">
                        <label htmlFor="minRating">Min rating</label>
                        <input
                            id="minRating"
                            type="number"
                            min="0"
                            max="5"
                            step="0.1"
                            placeholder="0"
                            value={filters.minRating}
                            onChange={(e) =>
                                setFilters((prev) => ({ ...prev, minRating: e.target.value }))
                            }
                        />
                    </div>

                    <button type="submit" className="btn btn-secondary btn-sm">
                        Apply filters
                    </button>
                </form>
            </section>

            {/* RESULTS */}
            <section className="search-results-shell">
                {loading ? (
                    <div className="search-status">Loading results…</div>
                ) : error ? (
                    <div className="search-status search-error">{error}</div>
                ) : results.length === 0 ? (
                    <div className="search-status">
                        No search results match your criteria.
                    </div>
                ) : (
                    <>
                        <div className="search-results-summary">
                            <p>
                                Showing {results.length} of {total} results for "{params.q}"
                            </p>
                        </div>

                        <div className="search-results-grid">
                            {results.map((r) => (
                                <SearchCard
                                    key={`${r.shop._id}-${r.service._id}`}
                                    result={r}
                                />
                            ))}
                        </div>
                    </>
                )}
            </section>

            {/* PAGINATION */}
            {totalPages > 1 && (
                <section className="search-pagination">
                    <button
                        className="btn btn-secondary btn-sm"
                        disabled={params.page <= 1}
                        onClick={() => handlePageChange(params.page - 1)}
                    >
                        Previous
                    </button>

                    <span>
                        Page {params.page} of {totalPages}
                    </span>

                    <button
                        className="btn btn-secondary btn-sm"
                        disabled={params.page >= totalPages}
                        onClick={() => handlePageChange(params.page + 1)}
                    >
                        Next
                    </button>
                </section>
            )}
        </main>
    );
}