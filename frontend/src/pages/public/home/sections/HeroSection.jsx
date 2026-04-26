import { Link } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import LazyImage from "../../../../components/LazyImage";
import {
  API_BASE_URL,
  FALLBACK_DEPARTMENTS,
  FEATURED_SERVICE_LIMIT,
  SERVICE_CARD_TONES
} from "../constants";
export default function HeroSection() {
  const [input, setInput] = useState("");
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(false);
  const[status,setStatus]=useState(false)

  const handleSearch = async (e) => {
    e.preventDefault();
    // if (!input.trim()) return;
    setInput(e.target.value);
    try {
      setLoading(true);

      const res = await axios.get(`${API_BASE_URL}/shops/getShops`, {
        params: { search: e.target.value }
      });
      if(res.data.shops.length===0){
        setStatus(true)
      }
      setShops(res.data.shops);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hero-column">
      <div className="search-support-row">
        <div className="hero-search">
          <button type="button" className="search-category">
            All Categories
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What do you need?"
          />

          {/* <button
            type="button"
            className="btn btn-ogani"
            onClick={handleSearch}
          >
            Search
          </button> */}
        </div>
      </div>

      {/* 🔍 Results BELOW (no CSS change needed above) */}
      <div style={{ marginTop: "20px" }}>
        {loading && <p>Loading...</p>}

        

       
        {shops.length > 0 ? (
                <div className="shop-highlight-grid">
                  {status?<p>No Shops found</p>:shops.map((shop) => (
                    <article key={shop._id} className="shop-highlight-card">
                      <Link className="shop-highlight-media" to={`/shops/${shop._id}`}>
                        <LazyImage
                          src={shop.images?.[0] || SHOP_PLACEHOLDER_IMAGE}
                          alt={`${shop.name || "Shop"} preview`}
                          height={200}
                          aspectRatio="4 / 3"
                          fetchPriority="low"
                        />
                      </Link>
                      <div className="shop-highlight-body">
                        <div className="shop-highlight-head">
                          <h3>{shop.shopName}</h3>
                          {/* <p className="shop-highlight-rating">
                            <span className="shop-star">★</span>
                            <span>{shop.ratingCount > 0 ? shop.rating.toFixed(1) : "New"}</span>
                            {shop.ratingCount > 0 ? (
                              <span className="shop-rating-count">({shop.ratingCount})</span>
                            ) : null}
                          </p> */}
                        </div>
                        <p className="shop-highlight-location">{shop.address.city}</p>
                        {/* <p className="shop-highlight-label">{shop.label}</p> */}
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
      </div>

      {/* existing banner unchanged */}
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
            <Link className="btn btn-ogani" to="/menu">
              Shop Now
            </Link>
            <Link className="btn btn-secondary" to="/reviews">
              Read Reviews
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
