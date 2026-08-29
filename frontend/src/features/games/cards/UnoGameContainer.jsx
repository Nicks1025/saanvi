import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams, useBlocker } from 'react-router-dom';
import useCardsGame from './useCardsGame';
import { GAME_SCREENS } from './types';
import CardsLobbyView from './views/CardsLobbyView';
import CreateGameView from './views/CreateGameView';
import JoinGameView from './views/JoinGameView';
import WaitingRoomView from './views/WaitingRoomView';
import GameTableView from './views/GameTableView';
import GameResultView from './views/GameResultView';
import RulesModal from './components/RulesModal';
import SModal from '../../../components/common/SModal';
import './cards.css';

export const UnoGameContainer = () => {
  const game = useCardsGame();
  const location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();

  const {
    currentScreen,
    setCurrentScreen,
    room,
    setRoom,
    players,
    setPlayers,
    initializeMatch,
    isRulesModalOpen,
    setIsRulesModalOpen,
    rulesInitialTab,
    openRules,
    gameResult,
  } = game;

  const joinAttemptRef = useRef(null);
  const [isJoiningUrl, setIsJoiningUrl] = useState(!!roomId);

  // Sync ref when room is joined via UI (Create/Join buttons)
  useEffect(() => {
    if (room?.code) {
      joinAttemptRef.current = room.code;
    }
  }, [room?.code]);

  // Check URL path params (e.g. /games/uno/X7K29)
  useEffect(() => {
    if (!roomId) {
      joinAttemptRef.current = null;
      setIsJoiningUrl(false);
      return;
    }

    if (roomId && game.handleJoinRoom && room?.code !== roomId.toUpperCase() && joinAttemptRef.current !== roomId) {
      joinAttemptRef.current = roomId;
      setIsJoiningUrl(true);
      
      // Handle join and gracefully catch errors
      game.handleJoinRoom(roomId.toUpperCase()).catch(() => {
        // Drop the invalid roomId from URL
        navigate('/games/uno', { replace: true, state: { forced: true } });
      }).finally(() => {
        setIsJoiningUrl(false);
      });
    }
  }, [roomId, game, navigate, room?.code]);

  const handleStartGame = () => {
    initializeMatch(players.length);
    setCurrentScreen(GAME_SCREENS.GAME_TABLE);
  };

  // Block navigation when inside an active game (only block GAME_TABLE, not WAITING_ROOM)
  const isPlaying = roomId && currentScreen === GAME_SCREENS.GAME_TABLE;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => 
      isPlaying && currentLocation.pathname !== nextLocation.pathname && !nextLocation.state?.forced
  );

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isPlaying) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isPlaying]);

  const renderActiveScreen = () => {
    // FORCE LOBBY ROUTES IF NO ROOM ID
    if (!roomId) {
      if (currentScreen === GAME_SCREENS.CREATE) {
        return (
          <CreateGameView
            onNavigate={setCurrentScreen}
            onCreateRoom={game.handleCreateRoom}
            openRules={openRules}
          />
        );
      }
      if (currentScreen === GAME_SCREENS.JOIN) {
        return (
          <JoinGameView
            onNavigate={setCurrentScreen}
            onJoinRoom={(roomInput) => game.handleJoinRoom(roomInput.code || roomInput)}
          />
        );
      }
      if (currentScreen === GAME_SCREENS.RESULT) {
        return (
          <GameResultView
            gameResult={gameResult}
            onLeaveGame={() => {
              game.executeLeaveRoom();
              navigate('/games/uno', { replace: true, state: { forced: true } });
            }}
          />
        );
      }
      return (
        <CardsLobbyView
          onNavigate={setCurrentScreen}
          openRules={openRules}
        />
      );
    }

    if (isJoiningUrl) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px] text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-gray-400">Rejoining table...</p>
        </div>
      );
    }

    switch (currentScreen) {
      case GAME_SCREENS.CREATE:
        return (
          <CreateGameView
            onNavigate={setCurrentScreen}
            onCreateRoom={game.handleCreateRoom}
            openRules={openRules}
          />
        );

      case GAME_SCREENS.JOIN:
        return (
          <JoinGameView
            onNavigate={setCurrentScreen}
            onJoinRoom={(roomInput) => game.handleJoinRoom(roomInput.code || roomInput)}
          />
        );

      case GAME_SCREENS.WAITING_ROOM:
        return (
          <WaitingRoomView
            room={room}
            players={players}
            setPlayers={setPlayers}
            onStartGame={handleStartGame}
            onLeaveRoom={() => {
              game.executeLeaveRoom();
              navigate('/games/uno', { replace: true, state: { forced: true } });
            }}
            openRules={openRules}
            isHost={game.isHost}
            onToggleReady={(isReady) => {
              game.socketService.emit('uno:toggle_ready', { roomCode: room.code, isReady });
            }}
          />
        );

      case GAME_SCREENS.GAME_TABLE:
        return (
          <GameTableView
            game={game}
            onLeaveGame={() => navigate('/games/uno')}
          />
        );

      case GAME_SCREENS.RESULT:
        return (
          <GameResultView
            gameResult={gameResult}
            onLeaveGame={game.handleLeaveRoom}
          />
        );

      case GAME_SCREENS.LOBBY:
      default:
        return (
          <CardsLobbyView
            onNavigate={setCurrentScreen}
            openRules={openRules}
          />
        );
    }
  };

  return (
    <div className="page-container uno-game-container" id="uno-game-container">
      {/* Active Screen View */}
      {renderActiveScreen()}

      {/* Global Rules Modal */}
      <RulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        initialTab={rulesInitialTab}
        roomRules={room?.rules}
      />

      {/* Navigation Confirmation Modal */}
      <SModal
        isOpen={blocker.state === 'blocked'}
        onCancel={() => blocker.reset && blocker.reset()}
        title="Leave Active Game?"
        icon="Flame"
        confirmText="Leave Game"
        cancelText="Stay"
        onConfirm={() => {
          game.executeLeaveRoom();
          blocker.proceed && blocker.proceed();
        }}
        variant="danger"
      >
        <p style={{ margin: 0, color: 'var(--text-b)' }}>
          Are you sure you want to leave the active game? You will forfeit your spot and the game will continue without you.
        </p>
      </SModal>
    </div>
  );
};

export default UnoGameContainer;
