import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CARD_COLORS,
  CARD_TYPES,
  createStandardDeck,
  shuffleDeck,
  GAME_SCREENS,
  STACKING_RULES,
  WILD_FOUR_RULES,
} from './types';
import { isCardLegallyPlayable, getPlayableCardIds } from './cardValidation';
import toast from 'react-hot-toast';
import { createUnoRoom, joinUnoRoom } from './services/unoService';
import socketService from '../../../services/socket.client';
import { useAuth } from '../../../store/AuthContext';
import { useUnoVoice } from './useUnoVoice';
import { useNavigate } from 'react-router-dom';

export const useCardsGame = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Screen & Navigation
  const [currentScreen, setCurrentScreen] = useState(GAME_SCREENS.LOBBY);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [rulesInitialTab, setRulesInitialTab] = useState('stacking');

  // Game Data
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [deckCount, setDeckCount] = useState(108);
  const [discardPile, setDiscardPile] = useState([]);
  const [activeColor, setActiveColor] = useState('RED');
  const [turnDirection, setTurnDirection] = useState(1);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0); // Index in players array
  const [drawStack, setDrawStack] = useState(0); // Cumulative draw penalty

  // Voice Integration
  const voice = useUnoVoice(room, user);

  // Modals & Interactivity
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [pendingWildCard, setPendingWildCard] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState(null);

  // UNO Mechanics State
  const [showUnoCallButton, setShowUnoCallButton] = useState(false);
  const [hasCalledUno, setHasCalledUno] = useState(false);

  // Animations & Flight
  const [flyingCard, setFlyingCard] = useState(null);
  const [drawAnimation, setDrawAnimation] = useState(null); // { id, playerId, count }
  const [cardPlayEvent, setCardPlayEvent] = useState(null); // { id, card, playerId }
  const [isReshuffling, setIsReshuffling] = useState(false);

  // Voice & Audio
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);

  // Connection Simulation
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [connectionMessage, setConnectionMessage] = useState(null);

  // Game Over / Results
  const [gameResult, setGameResult] = useState(null); // { winner, scores: [{ player, score, cardsLeft }] }

  // Authoritative Turn Timer State
  const TURN_DURATION_SECONDS = 30;
  const [turnExpiresAt, setTurnExpiresAt] = useState(() => Date.now() + TURN_DURATION_SECONDS * 1000);
  const [turnTimeLeft, setTurnTimeLeft] = useState(TURN_DURATION_SECONDS);
  const turnIntervalRef = useRef(null);
  const hasTimedOutRef = useRef(false);

  const localHand = players.find(p => p.id === user?.uuid)?.hand || [];
  const topCard = discardPile[discardPile.length - 1];

  const playableCardIds = getPlayableCardIds(
    localHand,
    topCard,
    activeColor,
    drawStack,
    drawStack > 0 ? (topCard?.type || null) : null,
    room?.rules || {}
  );

  const isCardPlayable = useCallback(
    (card) => {
      return isCardLegallyPlayable({
        card,
        hand: localHand,
        topCard,
        activeColor,
        activeStack: drawStack,
        pendingPenaltyType: drawStack > 0 ? (topCard?.type || null) : null,
        roomRules: room?.rules || {},
      });
    },
    [localHand, topCard, activeColor, drawStack, room?.rules]
  );

  const resetTurnTimer = useCallback((duration = TURN_DURATION_SECONDS) => {
    const newExpires = Date.now() + duration * 1000;
    setTurnExpiresAt(newExpires);
    setTurnTimeLeft(duration);
    hasTimedOutRef.current = false;
  }, []);

  // Reset & Initialize Match
  const initializeMatch = (count) => {
    if (room?.hostId === user?.uuid) {
      socketService.emit('uno:start_game', { roomCode: room.code });
    }
  };

  // Handle real API room creation
  const handleCreateRoom = async (roomConfig) => {
    try {
      toast.loading('Creating room...', { id: 'create-room' });
      const userData = {
        name: user?.name || user?.firstName || user?.username || 'Player',
        avatar: user?.avatar || user?.display_picture
      };
      
      const { roomCode } = await createUnoRoom(roomConfig, userData);
      toast.success('Room created!', { id: 'create-room' });
      
      await handleJoinRoom(roomCode);
    } catch (err) {
      toast.error('Failed to create room', { id: 'create-room' });
      console.error(err);
    }
  };

  const handleLeaveRoom = useCallback(() => {
    if (room) {
      socketService.emit('uno:leave', { roomCode: room.code });
    }
    // Strip URL params via React Router first
    navigate('/games/uno', { replace: true });
    
    // Defer state clearing to next tick to avoid triggering Auto-Join race condition
    setTimeout(() => {
      setCurrentScreen(GAME_SCREENS.LOBBY);
      setRoom(null);
      setPlayers([]);
    }, 10);
  }, [navigate, room]);

  const handleJoinRoom = async (roomCode) => {
    try {
      const userData = {
        name: user?.name || user?.firstName || user?.username || 'Player',
        avatar: user?.avatar || user?.display_picture
      };
      const roomData = await joinUnoRoom(roomCode, userData);
      setRoom(roomData);
      setPlayers(roomData.players.map(p => ({ ...p, isLocal: p.id === user?.uuid })));
      setCurrentScreen(GAME_SCREENS.WAITING_ROOM);
      
      // Update URL to match room
      navigate(`/games/uno/${roomCode}`, { replace: true });

      socketService.emit('uno:join', { roomCode: roomData.code });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to join room', { id: 'join-room' });
      console.error(err);
    }
  };

  const handleToggleReady = (isReady) => {
    if (!room) return;
    socketService.emit('uno:toggle_ready', { roomCode: room.code, isReady });
  };

  // -------------------------------------------------------------
  // Socket Listeners (Real-time synchronization)
  // -------------------------------------------------------------
  useEffect(() => {
    const handleRoomUpdated = (roomData) => {
      setRoom(roomData);
      setPlayers(roomData.players.map(p => ({ ...p, isLocal: p.id === user?.uuid })));
    };

    const handleGameStateUpdated = (roomData) => {
      setRoom(roomData);
      setPlayers(roomData.players.map(p => ({ ...p, isLocal: p.id === user?.uuid })));
      setActiveColor(roomData.activeColor);
      setTurnDirection(roomData.turnDirection);
      setCurrentTurnIndex(roomData.currentTurnIndex);
      setDrawStack(roomData.drawStack || 0);
      setDiscardPile(roomData.discardPile.slice(-4));
      setDeckCount(roomData.deck.length);

      if (roomData.status === 'PLAYING' && currentScreen !== GAME_SCREENS.GAME_TABLE) {
        setCurrentScreen(GAME_SCREENS.GAME_TABLE);
      } else if (roomData.status === 'GAME_OVER') {
        setCurrentScreen(GAME_SCREENS.RESULT);
      }
    };

    const handleCardPlayed = ({ playerId, card, eventId }) => {
      setDrawAnimation({
        active: true,
        type: 'PLAY_CARD',
        sourceId: playerId,
        targetId: 'discard-pile',
        count: 1,
        card: card,
        timestamp: eventId || Date.now()
      });
    };

    const handleCardDrawn = ({ playerId, count, eventId }) => {
      setDrawAnimation({
        active: true,
        type: 'DRAW_CARDS',
        sourceId: 'draw-pile',
        targetId: playerId,
        count: count,
        timestamp: eventId || Date.now()
      });
    };

    const handleGameStarted = () => {
      toast.success('Game is starting!');
      setCurrentScreen(GAME_SCREENS.GAME_TABLE);
    };

    const handleGameOver = ({ winnerId }) => {
      setGameResult({ winnerId, summary: 'Game finished', duration: 'Unknown' });
      setCurrentScreen(GAME_SCREENS.RESULT);
    };

    socketService.on('ROOM_UPDATED', handleRoomUpdated);
    socketService.on('GAME_STATE_UPDATED', handleGameStateUpdated);
    socketService.on('CARD_PLAYED', handleCardPlayed);
    socketService.on('CARD_DRAWN', handleCardDrawn);
    socketService.on('GAME_STARTED', handleGameStarted);
    socketService.on('GAME_OVER', handleGameOver);

    return () => {
      socketService.off('ROOM_UPDATED', handleRoomUpdated);
      socketService.off('GAME_STATE_UPDATED', handleGameStateUpdated);
      socketService.off('CARD_PLAYED', handleCardPlayed);
      socketService.off('CARD_DRAWN', handleCardDrawn);
      socketService.off('GAME_STARTED', handleGameStarted);
      socketService.off('GAME_OVER', handleGameOver);
    };
  }, [currentScreen, user]);

  // -------------------------------------------------------------
  // Core Actions
  // -------------------------------------------------------------

  const advanceTurn = () => {
    // In real multiplayer, this is handled server-side.
  };

  const playLocalCard = (cardOrId, overrideColor = null) => {
    const cardId = typeof cardOrId === 'object' ? cardOrId.id : cardOrId;
    if (!cardId || !room) return;
    
    // Ensure overrideColor is a valid string, not a boolean from click events
    const validColor = typeof overrideColor === 'string' ? overrideColor : null;
    
    // Find the full card object from local hand if necessary
    const cardObj = typeof cardOrId === 'object' ? cardOrId : players.find(p => p.isLocal)?.hand?.find(c => c.id === cardId);

    // If it's a wild card and color isn't picked yet, open the color picker modal!
    if (cardObj && (cardObj.type === 'wild' || cardObj.type === 'wild_draw_four') && !validColor) {
      setPendingWildCard(cardObj);
      setIsColorPickerOpen(true);
      return;
    }
    
    socketService.emit('uno:play_card', {
      roomCode: room.code,
      cardId: cardId,
      selectedColor: validColor
    });
    
    setSelectedCardId(null);
  };

  const drawCard = () => {
    if (!room) return;

    const currentPlayer = players[currentTurnIndex];
    if (currentPlayer?.id !== user?.uuid) {
      toast.error("Not your turn!");
      return;
    }

    socketService.emit('uno:draw_card', { roomCode: room.code });
  };

  // -------------------------------------------------------------
  // Specific UI Logic
  // -------------------------------------------------------------
  
  const handleCallUno = () => {
    if (!room) return;
    socketService.emit('uno:call_uno', { roomCode: room.code });
  };

  const handleCatchOpponentUno = (opponent) => {
    if (!room) return;
    socketService.emit('uno:catch_uno', { roomCode: room.code, targetId: opponent.id });
  };

  const handleSelectWildColor = (selectedColor) => {
    if (!pendingWildCard || !room) return;
    
    setIsColorPickerOpen(false);
    
    socketService.emit('uno:play_card', {
      roomCode: room.code,
      cardId: pendingWildCard.id,
      selectedColor: selectedColor
    });
    
    setPendingWildCard(null);
  };
  const updateRoomRules = (newRules) => {
    setRoom((prev) => ({
      ...prev,
      rules: {
        ...prev.rules,
        ...newRules,
      },
    }));
    toast.success('Room rules updated!');
  };

  return {
    // Screen navigation
    currentScreen,
    setCurrentScreen,
    room,
    setRoom,
    updateRoomRules,

    // Players
    players,
    setPlayers,
    localPlayer: players.find((p) => p.isLocal) || players[0],

    // Game Play State
    deckCount,
    discardPile,
    topCard,
    activeColor,
    localHand,
    playableCardIds,
    currentTurnIndex,
    currentTurnPlayer: players[currentTurnIndex] || players[0],
    isMyTurn: players[currentTurnIndex]?.id === user?.uuid,
    direction: turnDirection === 1 ? 'clockwise' : 'counter-clockwise',
    activeStack: drawStack,
    pendingPenaltyType: drawStack > 0 ? (topCard?.type || null) : null,
    lastPlayedBy: 'Opponent', // Placeholder
    flyingCard,
    drawAnimation,
    cardPlayEvent,
    isReshuffling,
    turnTimeLeft,
    isHost: room?.hostId === user?.uuid,

    // Actions
    initializeMatch,
    handleCreateRoom,
    handleJoinRoom,
    handleToggleReady,
    playLocalCard,
    drawCard,
    isCardPlayable,

    // Modals & Interactivity
    isColorPickerOpen,
    setIsColorPickerOpen,
    handleSelectWildColor,

    // Voice Chat
    isMicMuted: voice.isMicMuted,
    isSpeakerMuted: voice.isSpeakerMuted,
    toggleMic: voice.toggleMic,
    toggleSpeaker: voice.toggleSpeaker,

    // UNO Actions
    showUnoCallButton,
    unoTimeLeft: 0,
    hasCalledUno,
    handleCallUno,
    handleCatchOpponentUno,
    catchableOpponents: players.filter((p) => !p.isLocal && p.cardCount === 1 && !p.hasCalledUno && !p.missedUno),

    // Voice Chat State
    isMuted,
    isDeafened,
    toggleMute: () => setIsMuted(!isMuted),
    toggleDeafen: () => setIsDeafened(!isDeafened),

    // Rules Modal
    isRulesModalOpen,
    setIsRulesModalOpen,
    rulesInitialTab,
    setRulesInitialTab,
    openRules: (tab = 'basics') => {
      setRulesInitialTab(tab);
      setIsRulesModalOpen(true);
    },

    // Results & Connection
    gameResult,
    triggerGameOver: (winnerId = 'p1') => handleWin(winnerId),
    connectionStatus,
    setConnectionStatus,
    connectionMessage,
    setConnectionMessage,

    // Real API actions
    handleCreateRoom,
    handleJoinRoom,
    handleLeaveRoom,
  };
};

export default useCardsGame;
