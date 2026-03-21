import { useEffect, useRef, useState } from "react";

export default function LazyImage({
  src,
  alt = "",
  className = "",
  placeholder = null,
  height = 160,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: "140px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [src]);

  return (
    <div
      ref={containerRef}
      className={`lazy-image ${className}`.trim()}
      style={{ minHeight: height, position: "relative" }}
    >
      {!isLoaded ? (
        <div className="lazy-placeholder">
          {placeholder || <span className="spinner" aria-label="Loading image" />}
        </div>
      ) : null}
      {isVisible ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={`lazy-img${isLoaded ? " is-loaded" : ""}`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setIsLoaded(true)}
        />
      ) : null}
    </div>
  );
}
