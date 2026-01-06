// GameCarousel.jsx
import { useState } from "react";
import Carousel from "./Carousel";
import GameCoverCard from "./GameCoverCard";

export default function GameCarousel({ games }) {
  const [selectedId, setSelectedId] = useState(null);

  // Limit to 30 items maximum
  const displayGames = games.slice(0, 30);

  return (
    <Carousel gap={16}>
      {displayGames.map((game) => (
        <GameCoverCard
          key={game.id}
          gameId={game.id}
          coverUrl={game.coverUrl || `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover?.image_id}.webp`}
          genres={game.genres || game.genre_names || []}
          releaseDate={game.releaseDate || game.first_release_date}
          gameName={game.name}
          selected={game.id === selectedId}
          onSelect={() => setSelectedId(game.id)}
        />
      ))}
    </Carousel>
  );
}
