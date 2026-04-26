// import { Link } from "react-router-dom";
// import { useState,useEffect } from "react";
// import axios from "axios";
// import LazyImage from "../../../../components/LazyImage";
// import {
//   API_BASE_URL,
//   FALLBACK_DEPARTMENTS,
//   FEATURED_SERVICE_LIMIT,
//   SERVICE_CARD_TONES
// } from "../constants";
// export default function HeroSection() {
//   const [input, setInput] = useState("");
//   const [shops, setShops] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const[status,setStatus]=useState(false)

//   useEffect(() => {
//   if (!input.trim()) {
//     setShops([]);
//     return;
//   }

//   const delay = setTimeout(async () => {
//     try {
//       setLoading(true);

//       const res = await axios.get(`${API_BASE_URL}/shops/getShops`, {
//         params: { search: input }
//       });

//        if(res.data.shops.length===0){
//         setStatus(true)
//       }
//       setShops(res.data.shops);

//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   }, 300); 

//   return () => clearTimeout(delay);
// }, [input]);

//   // const handleSearch = async (e) => {
//   //   // e.preventDefault();
//   //   // if (!input.trim()) return;
//   //   setInput(e.target.value);
//   //   try {
//   //     setLoading(true);

//   //     const res = await axios.get(`${API_BASE_URL}/shops/getShops`, {
//   //       params: { search: e.target.value }
//   //     });
//   //     if(res.data.shops.length===0){
//   //       setStatus(true)
//   //     }
//   //     setShops(res.data.shops);
//   //   } catch (err) {
//   //     console.error(err);
//   //   } finally {
//   //     setLoading(false);
//   //   }
//   // };

//   return (
//     <div className="hero-column">
//       <div className="search-support-row">
//         <div className="hero-search">
//           <button type="button" className="search-category">
//             All Categories
//           </button>

//           <input
//             type="text"
//             value={input}
//             onChange={(e) => setInput(e.target.value)}
//             placeholder="What do you need?"
//           />

//           {/* <button
//             type="button"
//             className="btn btn-ogani"
//             onClick={handleSearch}
//           >
//             Search
//           </button> */}
//         </div>
//       </div>

//       {/* 🔍 Results BELOW (no CSS change needed above) */}
//       <div style={{ marginTop: "20px" }}>
//         {loading && <p>Loading...</p>}

        

       
//         {shops.length > 0 ? (
//                 <div className="shop-highlight-grid">
//                   {status?<p>No Shops found</p>:shops.map((shop) => (
//                     <article key={shop._id} className="shop-highlight-card">
//                       <Link className="shop-highlight-media" to={`/shops/${shop._id}`}>
//                         <LazyImage
//                           src={shop.images?.[0] || SHOP_PLACEHOLDER_IMAGE}
//                           alt={`${shop.name || "Shop"} preview`}
//                           height={200}
//                           aspectRatio="4 / 3"
//                           fetchPriority="low"
//                         />
//                       </Link>
//                       <div className="shop-highlight-body">
//                         <div className="shop-highlight-head">
//                           <h3>{shop.shopName}</h3>
//                           {/* <p className="shop-highlight-rating">
//                             <span className="shop-star">★</span>
//                             <span>{shop.ratingCount > 0 ? shop.rating.toFixed(1) : "New"}</span>
//                             {shop.ratingCount > 0 ? (
//                               <span className="shop-rating-count">({shop.ratingCount})</span>
//                             ) : null}
//                           </p> */}
//                         </div>
//                         <p className="shop-highlight-location">{shop.address.city}</p>
//                         {/* <p className="shop-highlight-label">{shop.label}</p> */}
//                       </div>
//                     </article>
//                   ))}
//                 </div>
//               ) : null}
//       </div>

//       {/* existing banner unchanged */}
//       <article className="hero-banner">
//         <div className="hero-copy">
//           <p className="hero-eyebrow">BOOK EASY</p>
//           <h1>
//             Professional
//             <br />
//             100% Trusted
//           </h1>
//           <p>Instant Confirmation Available</p>

//           <div className="hero-actions">
//             <Link className="btn btn-ogani" to="/menu">
//               Shop Now
//             </Link>
//             <Link className="btn btn-secondary" to="/reviews">
//               Read Reviews
//             </Link>
//           </div>
//         </div>
//       </article>
//     </div>
//   );
// }

import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import LazyImage from "../../../../components/LazyImage";
import {
  API_BASE_URL
} from "../constants";

const SHOP_PLACEHOLDER_IMAGE =
  "https://via.placeholder.com/100x100?text=Shop";

export default function HeroSection() {
  const [input, setInput] = useState("");
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // 🔍 Debounced search
  useEffect(() => {
    if (!input.trim()) {
      setShops([]);
      setShowDropdown(false);
      return;
    }

    const delay = setTimeout(async () => {
      try {
      setLoading(true);

      const res = await axios.get(`${API_BASE_URL}/shops/getShops`, {
        params: { search: input }
      });

      setShops(res.data.shops);
      setStatus(res.data.shops.length === 0);
      setShowDropdown(true);
    } catch (err) {
      console.error(err);
      setStatus(true);
    } finally {
      setLoading(false);
    }
    }, 300);

    return () => clearTimeout(delay);
  }, [input]);

  return (
    <div className="hero-column">
      <div className="search-support-row">
        {/* ✅ relative parent */}
        <div
          className="hero-search"
          style={{ position: "relative" }}
        >
          <button type="button" className="search-category">
            All Categories
          </button>

          <input
            type="text"
            value={input}
            placeholder="What do you need?"
            onChange={(e) => {
              setInput(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => input && setShowDropdown(true)}
            onBlur={() =>
              setTimeout(() => setShowDropdown(false), 200)
            }
          />

          {/* 🔽 Dropdown */}
          {showDropdown && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "#fff",
                border: "1px solid #eee",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                zIndex: 10,
                maxHeight: "300px",
                overflowY: "auto"
              }}
            >
              {loading && (
                <p style={{ padding: "10px" }}>Loading...</p>
              )}

              {!loading && status && (
                <p style={{ padding: "10px" }}>
                  No Shops found
                </p>
              )}

              {!loading &&
                shops.map((shop) => (
                  <Link
                    key={shop._id}
                    to={`/shops/${shop._id}`}
                    onClick={() => setShowDropdown(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px",
                      textDecoration: "none",
                      color: "#000",
                      borderBottom: "1px solid #f5f5f5"
                    }}
                  >
                    <LazyImage
                      src={
                        shop.images?.[0] ||
                        SHOP_PLACEHOLDER_IMAGE
                      }
                      alt={shop.shopName}
                      height={50}
                      aspectRatio="1 / 1"
                    />

                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontWeight: "500"
                        }}
                      >
                        {shop.shopName}
                      </p>
                      <small style={{ color: "#777" }}>
                        {shop.address?.city}
                      </small>
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* 🎯 Existing banner (unchanged) */}
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
