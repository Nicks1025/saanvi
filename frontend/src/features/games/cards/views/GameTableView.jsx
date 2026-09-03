import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  CircularTable,
} from '../components/CircularTable';
import { DrawPile } from "../components/DrawPile";
import { DrawAnimationLayer } from "../components/DrawAnimationLayer";
import { CardPlayAnimationLayer } from "../components/CardPlayAnimationLayer";
import { PlayerHand } from "../components/PlayerHand";
import { VoiceControls } from "../components/VoiceControls";
import { UnoControls } from "../components/UnoControls";
import { ColorPickerModal } from "../components/ColorPickerModal";
import { RulesModal } from "../components/RulesModal";
import { ConnectionBanner } from "../components/ConnectionBanner";
import { ArrowLeft, HelpCircle, Users, Clock, AlertTriangle } from 'lucide-react';
import SModal from '@/components/common/SModal';
import { useTranslation } from 'react-i18next';

export const GameTableView = ({ game, onLeaveGame }) => {
  const { t } = useTranslation();
  const [tableScale, setTableScale] = useState(0.85);
  const [tableConfig, setTableConfig] = useState({ w: 960, h: 520 });
  const arenaRef = useRef(null);

  const TABLE_W = 960;
  const TABLE_H = 520;
  const MAX_SCALE = 0.90;

  const recalcScale = useCallback(() => {
    if (!arenaRef.current) return;
    const { clientWidth: w, clientHeight: h } = arenaRef.current;

    // Use the short edge to detect mobile — phones in landscape have innerWidth > 768
    // but their short edge (innerHeight in landscape) is typically 360–430px
    const shortEdge = Math.min(window.innerWidth, window.innerHeight);
    const isMobile = shortEdge <= 500;
    const isPortrait = window.innerHeight > window.innerWidth;
    const isLandscape = !isPortrait;

    let baseW = 960;
    let baseH = 520;

    if (isMobile) {
      if (isPortrait) {
        baseW = 420;
        baseH = 460;
      } else {
        // Landscape mobile: header is hidden so we have the full screen height.
        // Use a compact horizontal layout that fits within ~350–430px height.
        baseW = 680;
        baseH = 260;
      }
    }

    const scaleW = (w - 8) / baseW;
    const scaleH = (h - 8) / baseH;
    // In landscape mobile, allow scale up to 1.0 to fill the freed space
    const maxScale = (isMobile && isLandscape) ? 1.0 : MAX_SCALE;
    setTableScale(Math.min(maxScale, scaleW, scaleH));
    setTableConfig({ w: baseW, h: baseH });
  }, []);

  useEffect(() => {
    recalcScale();
    const ro = new ResizeObserver(recalcScale);
    if (arenaRef.current) ro.observe(arenaRef.current);
    return () => ro.disconnect();
  }, [recalcScale]);

  useEffect(() => {
    document.body.classList.add('uno-game-active');
    return () => document.body.classList.remove('uno-game-active');
  }, []);

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

  const localPlayer = players.find(p => p.isLocal);

  return (
    <div className="game-table-view" id="saanvi-cards-game-table-view">
      {/* Top Table Control Bar */}
      <div className="table-top-bar">
        {/* Left: Exit button */}
        <div className="table-bar-left">
          <button
            className="table-bar-btn btn-exit"
            onClick={() => onLeaveGame()}
            title={t('games.uno.exit_game', 'Exit game')}
          >
            <ArrowLeft size={16} />
            <span className="btn-text">{t('games.uno.exit', 'Exit')}</span>
          </button>
        </div>

        {/* Right: Turn Timer & Rules Button */}
        <div className="table-bar-right">
          <div className={`table-timer-chip ${turnTimeLeft <= 5 ? 'timer-warning' : ''}`} title={t('games.uno.turn_timer', 'Turn Timer')}>
            <Clock size={14} className="timer-icon" />
            <span className="timer-digits">{formattedTimer}</span>
          </div>

          <button
            className="table-bar-btn btn-rules"
            onClick={() => openRules('basics')}
            title={t('games.uno.open_game_rules', 'Open game rules')}
            style={{ padding: '0.5rem' }}
          >
            <HelpCircle size={18} />
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
          tableConfig={tableConfig}
        />
      </div>

      {/* Card Play Flight Animation - outside zoom so coords are screen-relative */}
      <CardPlayAnimationLayer
        cardPlayEvent={cardPlayEvent}
        players={players}
        arenaRef={arenaRef}
        tableScale={tableScale}
        tableConfig={tableConfig}
      />

      {/* Visual Draw Card Flying Animation Layer - outside zoom so coords are screen-relative */}
      <DrawAnimationLayer
        drawAnimation={drawAnimation}
        players={players}
        arenaRef={arenaRef}
        tableScale={tableScale}
        tableConfig={tableConfig}
      />

      {/* Fixed Bottom-Left Voice Controls (Overlay, Zero Layout Footprint) */}
      <VoiceControls
        isMuted={isMicMuted}
        isDeafened={isSpeakerMuted}
        onToggleMute={toggleMic}
        onToggleDeafen={toggleSpeaker}
      />

      {/* Local Player Inactivity Strikes Warning */}
      {(localPlayer?.missedTurns || 0) > 0 && (
        <div style={{ position: 'fixed', bottom: '55px', right: '16px', zIndex: 100, display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 'bold', backdropFilter: 'blur(4px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <AlertTriangle size={16} />
          <span>{localPlayer.missedTurns}/3 Strikes</span>
        </div>
      )}

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

    </div>
  );
};

export default GameTableView;
