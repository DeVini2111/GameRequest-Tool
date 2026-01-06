// Carousel.jsx
import React, { useRef, useState, useEffect } from "react";
import PropTypes from "prop-types";

export default function Carousel({
  children,
  gap = 16,
  sidePadding = 0,
}) {
  const carouselRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Detect touch device - use media query for more accurate detection
  useEffect(() => {
    const isMobile = window.matchMedia('(pointer: coarse)').matches;
    setIsTouchDevice(isMobile);
  }, []);

  // Track scroll position for progress bar
  const [scrollProgress, setScrollProgress] = useState(0);

  // Update scroll button states
  const updateScrollButtons = () => {
    const el = carouselRef.current;
    if (!el) return;
    
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.offsetWidth - 10);
    
    // Calculate scroll progress for mobile indicator
    const maxScroll = el.scrollWidth - el.offsetWidth;
    const progress = maxScroll > 0 ? (el.scrollLeft / maxScroll) * 100 : 0;
    setScrollProgress(progress);
  };

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;

    updateScrollButtons();
    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    
    // Update on resize for responsive layouts
    const resizeObserver = new ResizeObserver(updateScrollButtons);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      resizeObserver.disconnect();
    };
  }, [children]);

  // Calculate how many items fit on screen
  const getItemsPerPage = () => {
    const el = carouselRef.current;
    if (!el) return 1;
    
    const firstChild = el.querySelector(".flex-none");
    if (!firstChild) return 1;
    
    const itemWidth = firstChild.getBoundingClientRect().width;
    const containerWidth = el.offsetWidth;
    const itemsPerPage = Math.floor(containerWidth / (itemWidth + gap));
    
    return Math.max(1, itemsPerPage);
  };

  // Scroll by the number of visible items
  const scrollLeft = () => {
    const el = carouselRef.current;
    if (!el) return;
    const itemsPerPage = getItemsPerPage();
    const firstChild = el.querySelector(".flex-none");
    if (!firstChild) return;
    const itemWidth = firstChild.getBoundingClientRect().width;
    const scrollDistance = itemsPerPage * (itemWidth + gap);
    el.scrollBy({ left: -scrollDistance, behavior: "smooth" });
  };

  const scrollRight = () => {
    const el = carouselRef.current;
    if (!el) return;
    const itemsPerPage = getItemsPerPage();
    const firstChild = el.querySelector(".flex-none");
    if (!firstChild) return;
    const itemWidth = firstChild.getBoundingClientRect().width;
    const scrollDistance = itemsPerPage * (itemWidth + gap);
    el.scrollBy({ left: scrollDistance, behavior: "smooth" });
  };

  // Arrow-key handler for desktop - attach globally but only trigger when cursor is over carousel
  useEffect(() => {
    if (isTouchDevice) return;

    const handleGlobalKeyDown = (e) => {
      const el = carouselRef.current;
      if (!el) return;

      // Only trigger if cursor is over this specific carousel
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX || window.lastMouseX;
      const mouseY = e.clientY || window.lastMouseY;

      // Check if we have a recent mouse position (from mousemove)
      if (window.lastMouseX === undefined || window.lastMouseY === undefined) {
        return; // Don't scroll if we don't know where the mouse is
      }

      const isInside =
        mouseX >= rect.left &&
        mouseX <= rect.right &&
        mouseY >= rect.top &&
        mouseY <= rect.bottom;

      if (!isInside) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollLeft();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollRight();
      }
    };

    // Track mouse position globally
    const handleMouseMove = (e) => {
      window.lastMouseX = e.clientX;
      window.lastMouseY = e.clientY;
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isTouchDevice]);

  // Local keydown handler for carousel focus
  const handleKeyDown = (e) => {
    if (isTouchDevice) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      scrollLeft();
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      scrollRight();
    }
  };

  return (
    <div className="relative overflow-visible">
      {/* Desktop: Arrow buttons - always visible */}
      {!isTouchDevice && (
        <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 flex justify-between items-center px-4 pointer-events-none z-20">
          <button
            onClick={scrollLeft}
            disabled={!canScrollLeft}
            aria-label="Previous"
            className="
              pointer-events-auto p-3 rounded-full
              bg-gray-800 bg-opacity-50 hover:bg-opacity-75
              focus:outline-none transition transform hover:scale-105
              disabled:opacity-10 disabled:cursor-not-allowed
            "
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <button
            onClick={scrollRight}
            disabled={!canScrollRight}
            aria-label="Next"
            className="
              pointer-events-auto p-3 rounded-full
              bg-gray-800 bg-opacity-50 hover:bg-opacity-75
              focus:outline-none transition transform hover:scale-105
              disabled:opacity-10 disabled:cursor-not-allowed
            "
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Scrollable container */}
      <div
        ref={carouselRef}
        tabIndex={!isTouchDevice ? 0 : -1}
        onKeyDown={handleKeyDown}
        className={`
          flex overflow-x-auto scroll-smooth
          ${isTouchDevice ? 'snap-x snap-mandatory' : ''}
          outline-none focus:outline-none
        `}
        style={{
          gap: `${gap}px`,
          padding: `0px ${sidePadding}px`,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {/* Always hide scrollbar */}
        <style>{`
          .overflow-x-auto::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {React.Children.map(children, child =>
          React.cloneElement(child, {
            className: [
              child.props.className,
              isTouchDevice ? "snap-start" : "",
              "flex-none",
            ].filter(Boolean).join(" "),
          })
        )}
      </div>

      {/* Mobile: Scroll indicator bar */}
      {isTouchDevice && (
        <div className="flex justify-center mt-3">
          <div className="h-1 w-32 bg-gray-700 rounded-full relative">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-150 absolute left-0"
              style={{
                width: '25%',
                left: `${scrollProgress}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

Carousel.propTypes = {
  children:    PropTypes.node.isRequired,
  gap:         PropTypes.number,
  sidePadding: PropTypes.number,
};
