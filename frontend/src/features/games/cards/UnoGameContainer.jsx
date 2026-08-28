import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import useCardsGame from './useCardsGame';
import { GAME_SCREENS } from './types';
import CardsLobbyView from './views/CardsLobbyView';
import CreateGameView from './views/CreateGameView';
import JoinGameView from './views/JoinGameView';
import WaitingRoomView from './views/WaitingRoomView';
import GameTableView from './views/GameTableView';
import GameResultView from './views/GameResultView';
import RulesModal from './components/RulesModal';
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

  // Check URL path params (e.g. /games/uno/X7K29) or search params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const playParam = params.get('play');

    if (roomId && game.handleJoinRoom && room?.code !== roomId.toUpperCase()) {
      // Handle join and gracefully catch errors
      game.handleJoinRoom(roomId.toUpperCase()).catch(() => {
        // Drop the invalid roomId from URL
        navigate('/games/uno', { replace: true });
      });
    } else if (playParam === 'true' && currentScreen !== GAME_SCREENS.GAME_TABLE) {
      initializeMatch();
      setCurrentScreen(GAME_SCREENS.GAME_TABLE);
    }
  }, [roomId, location.search, game.handleJoinRoom, initializeMatch, setCurrentScreen, navigate, room?.code, currentScreen]);

  const handleStartGame = () => {
    initializeMatch(players.length);
    setCurrentScreen(GAME_SCREENS.GAME_TABLE);
  };

  const renderActiveScreen = () => {
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
            onToggleReady={game.handleToggleReady}
            onLeaveRoom={game.handleLeaveRoom}
            openRules={openRules}
            isHost={game.isHost}
          />
        );

      case GAME_SCREENS.GAME_TABLE:
        return (
          <GameTableView
            game={game}
            onLeaveGame={game.handleLeaveRoom}
          />
        );

      case GAME_SCREENS.RESULT:
        return (
          <GameResultView
            gameResult={gameResult}
            onPlayAgain={() => {
              initializeMatch();
              setCurrentScreen(GAME_SCREENS.GAME_TABLE);
            }}
            onLeaveGame={() => setCurrentScreen(GAME_SCREENS.LOBBY)}
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
    <div className="content-container uno-game-container" id="uno-game-container">
      {/* Active Screen View */}
      {renderActiveScreen()}

      {/* Global Rules Modal */}
      <RulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        initialTab={rulesInitialTab}
        roomRules={room?.rules}
      />
    </div>
  );
};

export default UnoGameContainer;
