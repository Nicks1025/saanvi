import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'next/navigation';
import CardsLobbyView from './CardsLobbyView';
import CreateGameView from './CreateGameView';
import JoinGameView from './JoinGameView';
import WaitingRoomView from './WaitingRoomView';
import GameTableView from './GameTableView';
import GameResultView from './GameResultView';

// Mock ResizeObserver for JSDOM
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Dummy game props to ensure no ReferenceErrors are thrown during render
const dummyGame = {
  room: { code: 'TEST1', name: 'Test Room', players: [], hostId: 'user-123' },
  players: [{ id: 'user-123', name: 'Test Player', isLocal: true, cardCount: 7 }],
  currentTurnPlayer: { id: 'user-123' },
  isMyTurn: true,
  topCard: { color: 'RED', type: 'number', value: '5', id: 'red-5' },
  discardPile: [],
  activeColor: 'RED',
  deckCount: 100,
  drawCard: vi.fn(),
  playLocalCard: vi.fn(),
  localHand: [],
  playableCardIds: new Set(),
  direction: 'clockwise',
  activeStack: 0,
  lastPlayedBy: 'System',
  cardPlayEvent: null,
  drawAnimation: null,
  isColorPickerOpen: false,
  handleSelectWildColor: vi.fn(),
  showUnoCallButton: false,
  unoTimeLeft: 0,
  hasCalledUno: false,
  handleCallUno: vi.fn(),
  handleCatchOpponentUno: vi.fn(),
  catchableOpponents: [],
  isMicMuted: false,
  isSpeakerMuted: false,
  toggleMic: vi.fn(),
  toggleSpeaker: vi.fn(),
  isRulesModalOpen: false,
  setIsRulesModalOpen: vi.fn(),
  rulesInitialTab: 'stacking',
  openRules: vi.fn(),
  connectionStatus: 'connected',
  connectionMessage: '',
  turnTimeLeft: 30,
};

const renderWithRouter = (ui) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('Uno Game Views', () => {
  it('renders CardsLobbyView without crashing', () => {
    const { container } = renderWithRouter(<CardsLobbyView onCreateGame={vi.fn()} onJoinGame={vi.fn()} />);
    expect(container).toBeInTheDocument();
  });

  it('renders CreateGameView without crashing', () => {
    const { container } = renderWithRouter(<CreateGameView onCreateRoom={vi.fn()} onCancel={vi.fn()} />);
    expect(container).toBeInTheDocument();
  });

  it('renders JoinGameView without crashing', () => {
    const { container } = renderWithRouter(<JoinGameView onJoinRoom={vi.fn()} onCancel={vi.fn()} />);
    expect(container).toBeInTheDocument();
  });

  it('renders WaitingRoomView without crashing', () => {
    const { container } = renderWithRouter(
      <WaitingRoomView
        room={dummyGame.room}
        players={dummyGame.players}
        setPlayers={vi.fn()}
        onStartGame={vi.fn()}
        onLeaveRoom={vi.fn()}
        openRules={vi.fn()}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders GameTableView without crashing', () => {
    const { container } = renderWithRouter(<GameTableView game={dummyGame} onLeaveGame={vi.fn()} />);
    expect(container).toBeInTheDocument();
  });

  it('renders GameResultView without crashing', () => {
    const mockGameResult = { winner: { name: 'Winner' }, scores: [] };
    const { container } = renderWithRouter(<GameResultView gameResult={mockGameResult} onPlayAgain={vi.fn()} onLeaveGame={vi.fn()} />);
    expect(container).toBeInTheDocument();
  });
});
