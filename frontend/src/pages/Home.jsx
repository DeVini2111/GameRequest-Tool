// src/pages/Home.jsx
import { useState, useEffect, useMemo } from "react";
import GameSection from "../components/GameSection";
import {
  fetchPopularBasic,
  fetchTop100Custom,
  fetchPopularType,
  fetchGenre,
} from "../api/igdb";

const GAME_LIMIT = 100;

const GENRE_CONFIGS = [
  { id: 5,  title: "Shooter"    },
  { id: 31, title: "Adventure"  },
  { id: 12, title: "RPG"        },
  { id: 15, title: "Strategy"   },
  { id: 13, title: "Simulation" },
  { id: 32, title: "Indie"      },
];

export default function Home() {
  const [popularGames, setPopularGames]   = useState([]);
  const [topGames, setTopGames]           = useState([]);
  const [popTypeGames, setPopTypeGames]   = useState([]);
  const [basicsLoaded, setBasicsLoaded]   = useState(false);
  const [error, setError]                 = useState("");
  const [genres, setGenres] = useState({});

  const genreConfigs = useMemo(() => GENRE_CONFIGS, []);

  useEffect(() => {
    let cancelled = false;

    async function loadBasics() {
      try {
        const [pop, top, popt] = await Promise.all([
          fetchPopularBasic(GAME_LIMIT),
          fetchTop100Custom(GAME_LIMIT),
          fetchPopularType(GAME_LIMIT, 5),
        ]);
        if (!cancelled) {
          setPopularGames(pop);
          setTopGames(top);
          setPopTypeGames(popt);
          setBasicsLoaded(true);
        }
      } catch (err) {
        console.error("Error loading basics:", err);
        if (!cancelled) {
          setError("Something went wrong loading the main data.");
        }
      }
    }

    loadBasics();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    genreConfigs.forEach(({ id }) => {
      fetchGenre(id, 5, GAME_LIMIT)
        .then(data => {
          if (!cancelled) {
            setGenres(prev => ({ ...prev, [id]: data }));
          }
        })
        .catch(err => {
          console.error(`Error loading genre ${id}:`, err);
        });
    });

    return () => { cancelled = true; };
  }, [genreConfigs]);

  return (
    <div className="w-full px-4 py-6">
      {/* Welcome Section */}
      <div className="max-w-7xl mx-auto mb-10">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Discover New Games
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Find your next gaming adventure
          </p>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="text-center text-red-400 mb-4">{error}</div>
      )}

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Popular Right Now</h2>
        {!basicsLoaded
          ? <div className="text-gray-400">Loading Popular Right Now…</div>
          : <GameSection games={popularGames} />
        }
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Top 100 Games</h2>
        {!basicsLoaded
          ? <div className="text-gray-400">Loading Top 100 Games…</div>
          : <GameSection games={topGames} />
        }
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Top 24h Peak Games</h2>
        {!basicsLoaded
          ? <div className="text-gray-400">Loading Top 24h Peak Games…</div>
          : <GameSection games={popTypeGames} />
        }
      </section>

      {genreConfigs.map(({ id, title }) => (
        <section key={id} className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Top {title}</h2>
          {genres[id]
            ? <GameSection games={genres[id]} />
            : <div className="text-gray-400">Loading {title}…</div>
          }
        </section>
      ))}
    </div>
  );
}
