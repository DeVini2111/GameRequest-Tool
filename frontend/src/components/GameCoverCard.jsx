// GameCoverCard.jsx
import PropTypes from "prop-types";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function GameCoverCard({
  coverUrl,
  genres,
  releaseDate,
  variant = "carousel",
  gameName = "",
  gameId,
}) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();

  const handleClick = () => {
    if (gameId) {
      navigate(`/game/${gameId}`);
    }
  };

  return (
    <div
      className="flex-none flex flex-col items-center cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
    >
      {/* Cover - modern glass morphism effect with animated glow */}
      <div
        className={`
          w-40 sm:w-48 md:w-52 lg:w-56 aspect-[3/4]
          rounded-lg overflow-hidden
          transition-all duration-500 relative group
          ${hovered ? "shadow-2xl" : "shadow-lg"}
        `}
      >
        {/* Animated gradient glow background */}
        <div
          className={`
            absolute inset-0 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600
            opacity-0 mix-blend-screen pointer-events-none rounded-lg
            transition-opacity duration-500
            ${hovered ? "opacity-40" : "opacity-0"}
          `}
        />
        
        {/* Animated light flare effect */}
        <div
          className={`
            absolute -inset-1 bg-gradient-to-r from-transparent via-white to-transparent
            opacity-0 mix-blend-overlay pointer-events-none rounded-lg
            transition-all duration-500 blur-xl
            ${hovered ? "opacity-20 -translate-y-full" : "opacity-0"}
          `}
        />
      
        <img
          src={coverUrl}
          alt="cover art"
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* InfoBox under cover - fixed height for uniformity */}
      <div
        className={`
          relative z-10 mt-2
          w-40 sm:w-48 md:w-52 lg:w-56 h-24
          bg-gray-800 bg-opacity-90
          p-2 rounded-lg
          text-xs text-gray-100
          transition-all duration-300
          ${hovered ? "shadow-lg" : "shadow-md"}
          flex flex-col
        `}
      >
        {/* Game title */}
        {gameName && (
          <div className="font-bold text-sm text-white line-clamp-2 flex-shrink-0">
            {gameName}
          </div>
        )}
        
        {/* Genres - max 2 to keep uniform */}
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-auto flex-shrink-0">
            {genres.slice(0, 2).map((g) => (
              <span
                key={g}
                className="px-1 py-[2px] bg-gray-700 rounded text-xs font-semibold whitespace-nowrap"
              >
                {g}
              </span>
            ))}
          </div>
        )}
        
        {/* Release Date */}
        {releaseDate && (
          <div className="font-medium text-gray-300 text-xs mt-auto flex-shrink-0">
            {new Date(releaseDate * 1000).toLocaleDateString("en-US")}
          </div>
        )}
      </div>
    </div>
  );
}

GameCoverCard.propTypes = {
  coverUrl:    PropTypes.string.isRequired,
  genres:      PropTypes.arrayOf(PropTypes.string).isRequired,
  releaseDate: PropTypes.number,
  variant:     PropTypes.oneOf(["carousel", "search"]),
  gameName:    PropTypes.string,
  gameId:      PropTypes.number.isRequired,
};
