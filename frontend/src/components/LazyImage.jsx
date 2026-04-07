import { useEffect, useRef, useState } from "react";

/**
 * IntersectionObserver-backed lazy image loader.
 * Falls back to native `loading="lazy"` when IO isn't available.
 */
export default function LazyImage({
  src,
  alt = "",
  className = "",
  placeholder = null,
  height = 160,
  aspectRatio,
  srcSet,
  sizes,
  fetchPriority = "auto",
  ...rest
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setIsLoaded(false);
  }, [src]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    // If IntersectionObserver isn't supported, render immediately and rely on native lazy.
    if (typeof IntersectionObserver !== "function") {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [src]);

  const wrapperStyle = {
    position: "relative",
    width: "100%",
    // When an aspect ratio is provided, let it control the sizing so the box stays perfectly
    // proportional (important for small thumbnails). Otherwise, fall back to a minimum height
    // to reserve space while the image loads.
    ...(aspectRatio ? { aspectRatio } : { minHeight: height }),
  };

  return (
    <div
      ref={containerRef}
      className={`lazy-image ${className}`.trim()}
      style={wrapperStyle}
    >
      {!isLoaded ? (
        <div className="lazy-placeholder">
          {placeholder || <span className="spinner" aria-label="Loading image" />}
        </div>
      ) : null}

      {isVisible ? (
        <img
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          loading="lazy"
          decoding="async"
          fetchPriority={fetchPriority}
          className={`lazy-img${isLoaded ? " is-loaded" : ""}`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setIsLoaded(true)}
          {...rest}
        />
      ) : null}
    </div>
  );
}
