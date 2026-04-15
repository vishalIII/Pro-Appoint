import { Link } from "react-router-dom";
import { useState } from "react";
export default function HeroSection() {
  const[input,setInput]=useState("")
  return (
    <div className="hero-column">
      <div className="search-support-row">
        <div className="hero-search">
          <button type="button" className="search-category" aria-label="Select category">
            All Categories
          </button>
          <input type="text" value={input} onChange={(e)=>setInput(e.target.value)} placeholder="What do you need?" aria-label="Search query" />
          <button type="button" className="btn btn-ogani">
            Search
          </button>
        </div>

        {/* <div className="support-box">
          <div className="support-icon" aria-hidden="true">
            TEL
          </div>
          <div>
            <p className="support-number">+65 11.188.888</p>
            <p className="support-text">support 24/7 time</p>
          </div>
        </div> */}
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
            <Link className="btn btn-ogani" to="/menu">
              Shop Now
            </Link>
            <Link className="btn btn-secondary" to="/reviews">
              Read Reviews
            </Link>
          </div>
        </div>

        {/* <div className="hero-produce" aria-hidden="true">
          <span className="produce-shape shape-leaf">LF</span>
          <span className="produce-shape shape-eggplant">EG</span>
          <span className="produce-shape shape-tomato">TM</span>
        </div> */}
      </article>
    </div>
  );
}
