import { useState } from "react";
import LazyImage from "./LazyImage";

/**
 * ImageCarousel component for displaying shop and service images with navigation.
 * @param {Object} props
 * @param {string[]} props.images - Array of image URLs
 * @param {string} props.alt - Alt text for images
 * @param {string} props.type - 'shop' or 'service' for different styling
 * @param {number} props.height - Height of the carousel
 * @param {string} props.aspectRatio - CSS aspect ratio (optional)
 */
export default function ImageCarousel({
  images = [],
  alt = "Image",
  type = "shop",
  height = 260,
  aspectRatio
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return null;
  }

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToImage = (index) => {
    setCurrentIndex(index);
  };

  const containerClass = type === "shop" ? "image-carousel-shop" : "image-carousel-service";
  const imageClass = type === "shop" ? "carousel-shop-image" : "carousel-service-image";

  return (
    <div className={`image-carousel ${containerClass}`}>
      <button
        className="carousel-nav carousel-nav-prev"
        onClick={prevImage}
        aria-label="Previous image"
        disabled={images.length <= 1}
      >
        ‹
      </button>

      <div className="carousel-image-container">
        <LazyImage
          src={images[currentIndex]}
          alt={`${alt} ${currentIndex + 1}`}
          className={imageClass}
          height={height}
          aspectRatio={aspectRatio}
          fetchPriority="high"
        />
      </div>

      <button
        className="carousel-nav carousel-nav-next"
        onClick={nextImage}
        aria-label="Next image"
        disabled={images.length <= 1}
      >
        ›
      </button>

      {images.length > 1 && (
        <div className="carousel-indicators">
          {images.map((_, index) => (
            <button
              key={index}
              className={`carousel-indicator ${index === currentIndex ? "active" : ""}`}
              onClick={() => goToImage(index)}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}