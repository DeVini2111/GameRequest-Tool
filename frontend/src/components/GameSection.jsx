// src/components/GameSection.jsx
import PropTypes from "prop-types";
import GameCarouselModular from "./GameCarousel";

export default function GameSection({ title, games}) {
  return (
    <section className="mb-8">
      <h2 className="text-2xl font-semibold text-white mb-4">{title}</h2>
      <GameCarouselModular games={games} />
    </section>
  );
}

GameSection.propTypes = {
  title: PropTypes.string.isRequired,
  games: PropTypes.array.isRequired,
};
