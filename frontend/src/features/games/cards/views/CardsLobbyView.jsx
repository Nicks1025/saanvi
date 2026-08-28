import React, { useState, useEffect } from 'react';
import { PlusCircle, LogIn, BookOpen, Users, Sparkles, Trophy, Flame, Radio, Play, Trash2, ArrowRight } from 'lucide-react';
import { GAME_SCREENS } from '../types';
import SButton from '../../../../components/common/SButton';
import { fetchUserRooms, deleteUserRoom } from '../services/unoService';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export const CardsLobbyView = ({ onNavigate, openRules }) => {
  const navigate = useNavigate();
  const [activeRooms, setActiveRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      setLoadingRooms(true);
      const data = await fetchUserRooms();
      setActiveRooms(data.rooms || []);
    } catch (error) {
      console.error('Failed to load active rooms', error);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleDeleteRoom = async (roomId) => {
    try {
      await deleteUserRoom(roomId);
      toast.success('Room deleted');
      setActiveRooms(prev => prev.filter(r => r.code !== roomId));
    } catch (error) {
      toast.error('Failed to delete room');
    }
  };
  const handleCreateClick = () => {
    if (activeRooms.length > 0) {
      toast.error('You already have an active room. Delete it to create a new one.', { id: 'room-limit' });
      return;
    }
    onNavigate(GAME_SCREENS.CREATE);
  };

  return (
    <div className="cards-lobby-view animate-fadeIn" id="cards-lobby-view">
      {/* Hero Header */}
      <div className="lobby-hero-card">
        <div className="lobby-hero-left">
          <div className="brand-pill">
            <Sparkles size={14} className="text-purple-400" />
            <span>MULTIPLAYER TABLETOP</span>
          </div>
          <h1 className="lobby-hero-title">UNO</h1>
          <p className="lobby-hero-tagline">
            Play together. Think fast. Own the table.
          </p>

          {/* Primary Action Buttons */}
          <div className="lobby-primary-actions">
            <button
              className="s-button btn-primary btn-hero-action"
              onClick={handleCreateClick}
            >
              <PlusCircle size={18} />
              <span>Create Game</span>
            </button>

            <button
              className="s-button btn-hero-secondary"
              onClick={() => onNavigate(GAME_SCREENS.JOIN)}
            >
              <LogIn size={18} />
              <span>Join Game</span>
            </button>

          </div>
        </div>

        {/* Hero Visual Card Showcase */}
        <div className="lobby-hero-right">
          <div className="lobby-cards-graphic">
            <div className="graphic-card card-g-red">
              <span className="g-corner">7</span>
              <span className="g-center">7</span>
            </div>
            <div className="graphic-card card-g-blue">
              <span className="g-corner">⊘</span>
              <span className="g-center">⊘</span>
            </div>
            <div className="graphic-card card-g-wild">
              <span className="g-corner">✦</span>
              <span className="g-center">✦</span>
            </div>
            <div className="graphic-card card-g-green">
              <span className="g-corner">+2</span>
              <span className="g-center">+2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="lobby-highlights-grid">
        <div className="highlight-box">
          <div className="highlight-icon-wrap bg-purple-500/10 text-purple-400">
            <Users size={22} />
          </div>
          <h3>2 to 8 Players</h3>
          <p>Adaptive circular tabletop dynamically scaling from 1v1 duels to 8-player arena matches.</p>
        </div>

        <div className="highlight-box">
          <div className="highlight-icon-wrap bg-amber-500/10 text-amber-400">
            <Flame size={22} />
          </div>
          <h3>Draw Card Stacking</h3>
          <p>Chain +2 on +2, +4 on +2, and +4 on +4 to redirect draw penalties across the circle.</p>
        </div>

        <div className="highlight-box">
          <div className="highlight-icon-wrap bg-emerald-500/10 text-emerald-400">
            <Radio size={22} />
          </div>
          <h3>Integrated Voice Chat</h3>
          <p>Crystal-clear live audio indicator with individual mute, speaker controls, and speaking ring visualizer.</p>
        </div>

        <div className="highlight-box cursor-pointer" onClick={() => openRules('basics')}>
          <div className="highlight-icon-wrap bg-blue-500/10 text-blue-400">
            <BookOpen size={22} />
          </div>
          <h3>Rules & Card Guide</h3>
          <p>Learn matching mechanics, Wild selections, and the crucial UNO call & catch penalties.</p>
        </div>
      </div>

      {/* Active Game Rooms */}
      <div className="lobby-recent-section">
        <div className="recent-header">
          <h2>Active Game Rooms</h2>
          <button className="view-rules-link" onClick={() => openRules('basics')}>
            <BookOpen size={16} />
            <span>How to Play & Rules</span>
          </button>
        </div>

        {loadingRooms ? (
          <div className="rooms-empty-state" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            <p>Loading your rooms...</p>
          </div>
        ) : activeRooms.length > 0 ? (
          <div className="active-rooms-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {activeRooms.map(room => (
              <div key={room.code} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-h)', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {room.code}
                    <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: room.status === 'WAITING' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)', color: room.status === 'WAITING' ? '#3b82f6' : '#10b981', letterSpacing: 'normal' }}>
                      {room.status === 'WAITING' ? 'Waiting' : 'In Progress'}
                    </span>
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Created {new Date(room.createdAt).toLocaleTimeString()} • {room.players}/{room.playerLimit} Players</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="s-button btn-secondary" 
                    onClick={() => navigate(`/games/uno/${room.code}`)}
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    <span>Join Back</span>
                    <ArrowRight size={16} />
                  </button>
                  <button 
                    className="s-button" 
                    onClick={() => handleDeleteRoom(room.code)}
                    style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                    title="Delete Room"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rooms-empty-state" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            <p>No active rooms found. Create a new game to start playing!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardsLobbyView;
