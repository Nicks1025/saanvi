import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  CircularTable,
} from '../components/CircularTable';
import { DrawPile } from '../components/DrawPile';
import { DrawAnimationLayer } from '../components/DrawAnimationLayer';
import { CardPlayAnimationLayer } from '../components/CardPlayAnimationLayer';
import { PlayerHand } from '../components/PlayerHand';
import { VoiceControls } from '../components/VoiceControls';
import { UnoControls } from '../components/UnoControls';
import { ColorPickerModal } from '../components/ColorPickerModal';
import { RulesModal } from '../components/RulesModal';
import { ConnectionBanner } from '../components/ConnectionBanner';
import { ArrowLeft, HelpCircle, Users, Clock } from 'lucide-react';
import SModal from '../../../../components/common/SModal';

export const GameTableView = ({ game, onLeaveGame }) => {
  const [showExitModal, setShowExitModal] = useState(false);
  const [tableScale, setTableScale] = useState(0.85);
  const arenaRef = useRef(null);

  const TABLE_W = 960;
  const TABLE_H = 520;
  const MAX_SCALE = 0.90;

  const recalcScale = useCallback(() => {
    if (!arenaRef.current) return;
    const { clientWidth: w, clientHeight: h } = arenaRef.current;
    const scaleW = (w - 40) / TABLE_W;
    const scaleH = (h - 40) / TABLE_H;
    setTableScale(Math.min(MAX_SCALE, scaleW, scaleH));
  }, []);

  useEffect(() => {
    recalcScale();
    const ro = new ResizeObserver(recalcScale);
    if (arenaRef.current) ro.observe(arenaRef.current);
    return () => ro.disconnect();
  }, [recalcScale]);

  const {
    room,
    players,
    currentTurnPlayer,
    isMyTurn,
    topCard,
    discardPile,
    activeColor,
    deckCount,
    drawCard,
    playLocalCard,
    localHand,
    playableCardIds,
    direction,
    activeStack,
    lastPlayedBy,
    cardPlayEvent,
    drawAnimation,
    isColorPickerOpen,
    handleSelectWildColor,
    showUnoCallButton,
    unoTimeLeft,
    hasCalledUno,
    handleCallUno,
    handleCatchOpponentUno,
    catchableOpponents,
    isMicMuted,
    isSpeakerMuted,
    toggleMic,
    toggleSpeaker,
    isRulesModalOpen,
    setIsRulesModalOpen,
    rulesInitialTab,
    openRules,
    connectionStatus,
    connectionMessage,
    turnTimeLeft,
  } = game;

  const formattedTimer = `00:${String(Math.max(0, turnTimeLeft ?? 30)).padStart(2, '0')}`;

  return (
    <div className="game-table-view" id="saanvi-cards-game-table-view">
      {/* Top Table Control Bar */}
      <div className="table-top-bar">
        {/* Left: Exit button & Room info (No Game Code) */}
        <div className="table-bar-left">
          <button
            className="table-bar-btn btn-exit"
            onClick={() => setShowExitModal(true)}
            title="Exit game"
          >
            <ArrowLeft size={16} />
            <span className="btn-text">Exit</span>
          </button>

          <div className="table-room-chip">
            <span className="room-chip-title">{room?.name || 'UNO'}</span>
          </div>

          <div className="table-players-count-chip">
            <Users size={13} />
            <span>{players.length} Players</span>
          </div>
        </div>

        {/* Right: Turn Timer & Rules Button */}
        <div className="table-bar-right">
          <div className={`table-timer-chip ${turnTimeLeft <= 5 ? 'timer-warning' : ''}`} title="Turn Timer">
            <Clock size={14} className="timer-icon" />
            <span className="timer-digits">{formattedTimer}</span>
          </div>

          <button
            className="table-bar-btn btn-rules"
            onClick={() => openRules('basics')}
            title="Open game rules"
          >
            <HelpCircle size={16} />
            <span className="btn-text">Rules</span>
          </button>
        </div>
      </div>

      {/* Connection State Banner */}
      <ConnectionBanner
        status={connectionStatus}
        roomCode={room?.code || 'X7K29'}
        message={connectionMessage}
      />

      {/* Main Table Stage Area */}
      <div className="table-stage-arena" ref={arenaRef}>
        {/* Top-Left UNO Draw Pile with authoritative card count */}
        <DrawPile
          drawPileCount={deckCount}
          isMyTurn={isMyTurn}
          onDrawCard={drawCard}
          activeStack={activeStack}
        />


        {/* Circular Gameplay Table */}
        <CircularTable
          players={players}
          currentTurnPlayerId={currentTurnPlayer?.id}
          topCard={topCard}
          discardPile={discardPile}
          activeColor={activeColor}
          drawPileCount={deckCount}
          onDrawCard={drawCard}
          isMyTurn={isMyTurn}
          lastPlayedBy={lastPlayedBy}
          direction={direction}
          activeStack={activeStack}
          onCatchUno={handleCatchOpponentUno}
          onToggleMute={toggleMic}
          turnTimeLeft={turnTimeLeft}
          tableScale={tableScale}
        />
      </div>

      {/* Card Play Flight Animation - outside zoom so coords are screen-relative */}
      <CardPlayAnimationLayer
        cardPlayEvent={cardPlayEvent}
        players={players}
        arenaRef={arenaRef}
        tableScale={tableScale}
      />

      {/* Visual Draw Card Flying Animation Layer - outside zoom so coords are screen-relative */}
      <DrawAnimationLayer
        drawAnimation={drawAnimation}
        players={players}
        arenaRef={arenaRef}
        tableScale={tableScale}
      />

      {/* Fixed Bottom-Left Voice Controls (Overlay, Zero Layout Footprint) */}
      <VoiceControls
        isMuted={isMicMuted}
        isDeafened={isSpeakerMuted}
        onToggleMute={toggleMic}
        onToggleDeafen={toggleSpeaker}
      />

      {/* Floating UNO Action Controls */}
      <UnoControls
        showUnoCallButton={showUnoCallButton}
        onCallUno={handleCallUno}
        hasCalledUno={hasCalledUno}
        unoTimeLeft={unoTimeLeft}
        catchableOpponents={catchableOpponents}
        onCatchOpponentUno={handleCatchOpponentUno}
      />

      {/* Local Player Hand Fan at Bottom */}
      <PlayerHand
        cards={localHand}
        playableCardIds={playableCardIds}
        onCardClick={playLocalCard}
        onDrawCard={drawCard}
        isMyTurn={isMyTurn}
        hasCalledUno={hasCalledUno}
        activeStack={activeStack}
      />

      {/* Wild Color Selection Modal */}
      <ColorPickerModal
        isOpen={isColorPickerOpen}
        onSelectColor={handleSelectWildColor}
      />

      {/* Full Rules Guide Modal / Side Panel */}
      <RulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        initialTab={rulesInitialTab}
        roomRules={room?.rules}
      />

      {/* Exit Game Confirmation Modal */}
      <SModal
        isOpen={showExitModal}
        title="Leave Game Table?"
        onConfirm={() => {
          setShowExitModal(false);
          onLeaveGame();
        }}
        onCancel={() => setShowExitModal(false)}
        confirmText="Leave Game"
        cancelText="Stay & Play"
      >
        <p className="text-gray-300">
          Are you sure you want to leave room <strong>{room?.name}</strong>? Your current hand and points will be forfeited.
        </p>
      </SModal>
    </div>
  );
};

export default GameTableView;
