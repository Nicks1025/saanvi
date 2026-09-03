import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Gamepad2, 
  Brain, 
  Sparkles, 
  Flame, 
  Calculator, 
  HelpCircle, 
  Shuffle, 
  ArrowRight,
  Clock,
  Play,
  Users
} from 'lucide-react';

const MoreGamesSection = () => {
  const [filter, setFilter] = useState('all'); // 'all', 'available', 'upcoming'

  const games = [
    {
      id: 'game-uno',
      title: 'Multiplayer UNO',
      category: 'Cards & Tabletop',
      description: 'The classic fast-paced matching card game with custom rules, voice chat, and up to 8 players.',
      icon: Gamepad2,
      accent: 'purple',
      status: 'available',
      statusLabel: 'Available Now',
      players: '2-8 Players',
      route: '/games/uno',
      highlights: ['Voice Chat', 'Action Stacking', 'Room Codes']
    },
    {
      id: 'game-word-search',
      title: 'Word Search Puzzle',
      category: 'Word & Vocabulary',
      description: 'Find hidden words across multi-directional grids with customizable categories and time challenges.',
      icon: Brain,
      accent: 'amber',
      status: 'available',
      statusLabel: 'Available Now',
      players: 'Solo / Challenge',
      route: '/games/word-search',
      highlights: ['Custom Grids', 'Timer Mode', 'Themed Lists']
    },
    {
      id: 'game-truth-dare',
      title: 'Truth or Dare Party',
      category: 'Social & Party',
      description: 'Interactive room-based truth or dare with live spin bottle, player votes, and spice levels.',
      icon: Flame,
      accent: 'rose',
      status: 'upcoming',
      statusLabel: 'Coming Soon',
      players: '3-12 Players',
      highlights: ['Room Voting', 'Spice Filters', 'Live Reactions']
    },
    {
      id: 'game-math-blitz',
      title: 'Math Duel Speed Run',
      category: 'Brain & Math',
      description: 'Head-to-head arithmetic duels testing your quick calculation speed under intense countdown pressure.',
      icon: Calculator,
      accent: 'blue',
      status: 'upcoming',
      statusLabel: 'Coming Soon',
      players: '1v1 Duels',
      highlights: ['Speed Multipliers', 'Ranked Rounds', 'Combo Streaks']
    },
    {
      id: 'game-daily-trivia',
      title: 'Trivia & Riddles',
      category: 'General Knowledge',
      description: 'Daily brainteasers, logic riddles, and multiplayer trivia showdowns spanning science, pop culture, and history.',
      icon: HelpCircle,
      accent: 'emerald',
      status: 'upcoming',
      statusLabel: 'Coming Soon',
      players: 'Multiplayer',
      highlights: ['Daily Streak', 'Leaderboards', 'Hints System']
    },
    {
      id: 'game-word-scramble',
      title: 'Word Scramble Sprint',
      category: 'Word Games',
      description: 'Race the clock to unscramble jumbled letters into meaningful words before your opponent strikes.',
      icon: Shuffle,
      accent: 'indigo',
      status: 'upcoming',
      statusLabel: 'Coming Soon',
      players: '2-4 Players',
      highlights: ['Letter Shuffling', 'Buzzer Rounds', 'Word Banks']
    }
  ];

  const filteredGames = games.filter((game) => {
    if (filter === 'available') return game.status === 'available';
    if (filter === 'upcoming') return game.status === 'upcoming';
    return true;
  });

  return (
    <section className="home-section games-catalog-section" id="games-section">
      <div className="section-header-block text-center">
        <div className="section-pill-tag">
          <Gamepad2 size={14} />
          <span>Saanvi Arcade</span>
        </div>
        <h2 className="section-main-heading">
          Explore Our Game Universe
        </h2>
        <p className="section-sub-heading">
          Play live multiplayer games today, or preview what our game studio is building next.
        </p>

        {/* Filter Tabs */}
        <div className="games-filter-pills">
          <button 
            type="button" 
            className={`filter-pill ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Games ({games.length})
          </button>
          <button 
            type="button" 
            className={`filter-pill ${filter === 'available' ? 'active' : ''}`}
            onClick={() => setFilter('available')}
          >
            Available Now (2)
          </button>
          <button 
            type="button" 
            className={`filter-pill ${filter === 'upcoming' ? 'active' : ''}`}
            onClick={() => setFilter('upcoming')}
          >
            In Development (4)
          </button>
        </div>
      </div>

      <div className="games-card-grid">
        {filteredGames.map((game) => {
          const Icon = game.icon;
          const isAvailable = game.status === 'available';

          return (
            <div 
              key={game.id} 
              id={game.id}
              className={`game-catalog-card theme-${game.accent} ${!isAvailable ? 'card-upcoming' : ''}`}
            >
              <div className="game-card-header">
                <div className="game-icon-box">
                  <Icon size={24} />
                </div>
                <div className={`game-status-chip ${isAvailable ? 'chip-live' : 'chip-upcoming'}`}>
                  {isAvailable ? <Play size={11} /> : <Clock size={11} />}
                  <span>{game.statusLabel}</span>
                </div>
              </div>

              <div className="game-card-body">
                <div className="game-cat-label">{game.category}</div>
                <h3 className="game-title">{game.title}</h3>
                <p className="game-description">{game.description}</p>
              </div>

              <div className="game-meta-row">
                <div className="meta-players">
                  <Users size={14} />
                  <span>{game.players}</span>
                </div>
                <div className="meta-highlights">
                  {game.highlights.slice(0, 2).map((hl) => (
                    <span key={hl} className="hl-pill">{hl}</span>
                  ))}
                </div>
              </div>

              <div className="game-card-action-bar">
                {isAvailable ? (
                  <Link href={game.route} className="game-play-link">
                    <span>Play Now</span>
                    <ArrowRight size={16} />
                  </Link>
                ) : (
                  <div className="game-locked-notice">
                    <Sparkles size={14} />
                    <span>In Active Studio Pipeline</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default MoreGamesSection;
