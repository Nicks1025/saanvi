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
import { useTranslation } from 'react-i18next';

export const useCardsGame = () => {
  const { t } = useTranslation();
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
      toast.loading(t('games.uno.creating_room', 'Creating room...'), { id: 'create-room' });
      const userData = {
        name: user?.name || user?.firstName || user?.username || 'Player',
        avatar: user?.avatar || user?.display_picture
      };
      
      const { roomCode } = await createUnoRoom(roomConfig, userData);
      toast.success(t('games.uno.room_created', 'Room created!'), { id: 'create-room' });
      
      await handleJoinRoom(roomCode);
    } catch (err) {
      toast.error(t('games.uno.create_failed', 'Failed to create room'), { id: 'create-room' });
      console.error(err);
    }
  };

  const executeLeaveRoom = useCallback(() => {
    if (room) {
      socketService.emit('uno:leave', { roomCode: room.code });
    }
    // Defer state clearing to next tick to avoid triggering Auto-Join race condition
    setTimeout(() => {
      setCurrentScreen(GAME_SCREENS.LOBBY);
      setRoom(null);
      setPlayers([]);
    }, 10);
  }, [room]);

  const handleLeaveRoom = useCallback(() => {
    // Navigating away triggers the router's useBlocker modal if in an active game.
    navigate('/games/uno', { replace: true });
  }, [navigate]);

  const handleJoinRoom = async (roomCode) => {
    try {
      const userData = {
        name: user?.name || user?.firstName || user?.username || 'Player',
        avatar: user?.avatar || user?.display_picture
      };
      const roomData = await joinUnoRoom(roomCode, userData);
      setRoom(roomData);
      setPlayers(prev => roomData.players.map(p => {
        const existing = prev.find(ep => ep.id === p.id);
        return { ...p, hand: p.hand !== undefined ? p.hand : (existing?.hand || []), isLocal: p.id === user?.uuid };
      }));
      setCurrentScreen(GAME_SCREENS.WAITING_ROOM);
      
      // Update URL to match room
      navigate(`/games/uno/${roomCode}`, { replace: true });

      socketService.emit('uno:join', { roomCode: roomData.code });
    } catch (err) {
      toast.error(err.response?.data?.error || t('games.uno.join_failed', 'Failed to join room'), { id: 'join-room' });
      console.error(err);
      throw err;
    }
  };

  const handleToggleReady = (isReady) => {
    if (!room) return;
    socketService.emit('uno:toggle_ready', { roomCode: room.code, isReady });
  };

  // --- Update Room Rules ---
  const handleUpdateRules = (newRules) => {
    if (room?.hostId === user?.uuid && room) {
      socketService.emit('uno:update_rules', { roomCode: room.code, rules: newRules });
      toast.success(t('games.uno.rules_updated', 'Room rules updated!'));
    }
  };

  // -------------------------------------------------------------
  // Socket Listeners (Real-time synchronization)
  // -------------------------------------------------------------

  const currentScreenRef = useRef(currentScreen);
  useEffect(() => {
    currentScreenRef.current = currentScreen;
  }, [currentScreen]);

  useEffect(() => {
    const handleRoomUpdated = (roomData) => {
      setRoom(roomData);
      setPlayers(prev => roomData.players.map(p => {
        const existing = prev.find(ep => ep.id === p.id);
        return { ...p, hand: p.hand !== undefined ? p.hand : (existing?.hand || []), isLocal: p.id === user?.uuid };
      }));
    };

    const handleGameStateUpdated = (roomData) => {
      setRoom(roomData);
      setPlayers(prev => roomData.players.map(p => {
        const existing = prev.find(ep => ep.id === p.id);
        return { ...p, hand: p.hand !== undefined ? p.hand : (existing?.hand || []), isLocal: p.id === user?.uuid };
      }));
      setActiveColor(roomData.activeColor);
      setTurnDirection(roomData.turnDirection);
      setCurrentTurnIndex(roomData.currentTurnIndex);
      setDrawStack(roomData.drawStack || 0);
      setDiscardPile(roomData.discardPile.slice(-4));
      setDeckCount(roomData.deck.length);
      
      if (roomData.turnExpiresAt) {
        setTurnExpiresAt(roomData.turnExpiresAt);
      }

      if (roomData.status === 'PLAYING' && currentScreenRef.current !== GAME_SCREENS.GAME_TABLE) {
        setCurrentScreen(GAME_SCREENS.GAME_TABLE);
      } else if (roomData.status === 'GAME_OVER') {
        setCurrentScreen(GAME_SCREENS.RESULT);
      }
    };

    const handleCardPlayed = ({ playerId, card, eventId }) => {
      setCardPlayEvent({
        id: eventId || `play-${Date.now()}`,
        playerId,
        card
      });
    };

    const handleCardDrawn = ({ playerId, count, eventId }) => {
      setDrawAnimation({
        id: eventId || `draw-${Date.now()}`,
        playerId,
        count
      });
    };

    const handleGameStarted = () => {
      toast.success(t('games.uno.game_started', 'Game is starting!'));
      setCurrentScreen(GAME_SCREENS.GAME_TABLE);
    };

    const handleGameOver = ({ winnerId, roomId, scores = [] }) => {
      const enrichedScores = scores.map(s => ({
        ...s,
        isLocal: s.id === user?.uuid
      }));
      setGameResult({ 
        winnerId, 
        isLocalWinner: winnerId === user?.uuid,
        winner: enrichedScores.find(s => s.id === winnerId),
        scores: enrichedScores, 
        summary: 'Game finished', 
        duration: 'Unknown' 
      });
      setCurrentScreen(GAME_SCREENS.RESULT);
      navigate(`/games/uno/${roomId}/winner`, { replace: true, state: { forced: true } });
    };

    const handleRoomDeleted = () => {
      setRoom(null);
      setPlayers([]);
      setCurrentScreen(GAME_SCREENS.LOBBY);
      toast.error(t('games.uno.host_deleted_room', 'The host has deleted the room.'));
    };

    const handlePlayerRemoved = ({ playerId, reason }) => {
      if (playerId === user?.uuid) {
        toast.error(t('games.uno.removed_inactivity', 'You were removed from the game due to inactivity.'));
        executeLeaveRoom();
        navigate('/games/uno');
      } else {
        setPlayers(prev => prev.filter(p => p.id !== playerId));
        if (reason === 'timeout') {
          toast.error(t('games.uno.player_removed_inactivity', 'A player was removed due to inactivity.'), { icon: '🚪' });
        }
      }
    };

    socketService.on('ROOM_UPDATED', handleRoomUpdated);
    socketService.on('GAME_STATE_UPDATED', handleGameStateUpdated);
    socketService.on('CARD_PLAYED', handleCardPlayed);
    socketService.on('CARD_DRAWN', handleCardDrawn);
    socketService.on('GAME_STARTED', handleGameStarted);
    socketService.on('GAME_OVER', handleGameOver);
    socketService.on('ROOM_DELETED', handleRoomDeleted);
    socketService.on('PLAYER_KICKED', handlePlayerRemoved);

    return () => {
      socketService.off('ROOM_UPDATED', handleRoomUpdated);
      socketService.off('GAME_STATE_UPDATED', handleGameStateUpdated);
      socketService.off('CARD_PLAYED', handleCardPlayed);
      socketService.off('CARD_DRAWN', handleCardDrawn);
      socketService.off('GAME_STARTED', handleGameStarted);
      socketService.off('GAME_OVER', handleGameOver);
      socketService.off('ROOM_DELETED', handleRoomDeleted);
      socketService.off('PLAYER_KICKED', handlePlayerRemoved);
    };
  }, [user, navigate, executeLeaveRoom]);

  // Tick Timer Down visually
  useEffect(() => {
    if (currentScreen !== GAME_SCREENS.GAME_TABLE) return;

    const tick = () => {
      const now = Date.now();
      const left = Math.max(0, Math.floor((turnExpiresAt - now) / 1000));
      setTurnTimeLeft(left);
    };

    tick(); // Initial call
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [turnExpiresAt, currentScreen]);

  // -------------------------------------------------------------
  // Core Actions
  // -------------------------------------------------------------

  const advanceTurn = () => {
    // In real multiplayer, this is handled server-side.
  };

  const playLocalCard = async (cardId, chosenColor = null) => {
    const isMyTurn = players[currentTurnIndex]?.id === user?.uuid;
    if (!isMyTurn) {
      toast.error(t('games.uno.not_your_turn', 'Not your turn!'));
      return;
    }

    const cardObj = players.find(p => p.isLocal)?.hand?.find(c => c.id === cardId);
    
    // If it's a wild card and color isn't picked yet, open the color picker modal!
    if (cardObj && (cardObj.type === 'wild' || cardObj.type === 'wild_draw_four') && !chosenColor) {
      setPendingWildCard(cardObj);
      setIsColorPickerOpen(true);
      return;
    }
    
    try {
      await socketService.emit('uno:play_card', {
        roomCode: room.code,
        cardId: cardId,
        selectedColor: chosenColor
      });
    } catch (err) {
      console.error("Failed to play card:", err);
    }
    
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
    executeLeaveRoom,
  };
};

export default useCardsGame;
