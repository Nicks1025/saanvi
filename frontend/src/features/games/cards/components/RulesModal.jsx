import React, { useState } from 'react';
import { X, BookOpen, Layers, Flame, ShieldAlert, Sparkles, CheckCircle2, RefreshCw, Trophy } from 'lucide-react';
import { GameCard } from './GameCard';
import { CARD_COLORS, CARD_TYPES, STACKING_RULES, WILD_FOUR_RULES } from '../types';

export const RulesModal = ({ isOpen, onClose, initialTab = 'basics', roomRules }) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  if (!isOpen) return null;

  const isStackingOn = roomRules?.stacking === STACKING_RULES.ON || roomRules?.stacking === 'on';
  const isWild4Classic = roomRules?.wildDrawFour === WILD_FOUR_RULES.CLASSIC || roomRules?.wildDrawFour === 'classic';

  const sampleCards = {
    redSeven: { id: 'r7', color: CARD_COLORS.RED, type: CARD_TYPES.NUMBER, value: 7, label: '7' },
    blueSkip: { id: 'bs', color: CARD_COLORS.BLUE, type: CARD_TYPES.SKIP, value: 20, label: '⊘' },
    greenRev: { id: 'gr', color: CARD_COLORS.GREEN, type: CARD_TYPES.REVERSE, value: 20, label: '⇄' },
    yellowD2: { id: 'yd2', color: CARD_COLORS.YELLOW, type: CARD_TYPES.DRAW_TWO, value: 20, label: '+2' },
    wild: { id: 'w', color: CARD_COLORS.WILD, type: CARD_TYPES.WILD, value: 50, label: '✦' },
    wildD4: { id: 'wd4', color: CARD_COLORS.WILD, type: CARD_TYPES.WILD_DRAW_FOUR, value: 50, label: '+4' },
  };

  return (
    <div className="rules-panel-container animate-fadeIn" id="saanvi-rules-panel">
      <div className="rules-panel-card">
        {/* Header */}
        <div className="rules-panel-header">
          <div className="rules-title-group">
            <BookOpen size={18} className="text-purple-400" />
            <div>
              <h3>Game Rules</h3>
              <p className="rules-subtitle">
                {isStackingOn ? 'Stacking ON' : 'Stacking OFF'} &bull; {isWild4Classic ? 'Classic +4' : 'Always Allowed +4'}
              </p>
            </div>
          </div>
          <button className="rules-panel-close-btn" onClick={onClose} aria-label="Close rules">
            <X size={18} />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="rules-tabs-nav">
          <button
            className={`rules-tab-btn ${activeTab === 'basics' ? 'active' : ''}`}
            onClick={() => setActiveTab('basics')}
          >
            <BookOpen size={14} />
            <span>Basics</span>
          </button>
          <button
            className={`rules-tab-btn ${activeTab === 'cards' ? 'active' : ''}`}
            onClick={() => setActiveTab('cards')}
          >
            <Layers size={14} />
            <span>Cards</span>
          </button>
          <button
            className={`rules-tab-btn ${activeTab === 'stacking' ? 'active' : ''}`}
            onClick={() => setActiveTab('stacking')}
          >
            <Flame size={14} />
            <span>Room Rules</span>
          </button>
          <button
            className={`rules-tab-btn ${activeTab === 'uno' ? 'active' : ''}`}
            onClick={() => setActiveTab('uno')}
          >
            <ShieldAlert size={14} />
            <span>UNO</span>
          </button>
        </div>

        {/* Tab Content (Scrollable internally) */}
        <div className="rules-tab-body custom-scrollbar">
          {/* TAB 1: BASICS */}
          {activeTab === 'basics' && (
            <div className="rules-section-content animate-fadeIn">
              <div className="rule-card-block">
                <div className="rule-sub-head">
                  <Trophy size={16} className="text-amber-400" />
                  <h4>Objective & Winning Condition</h4>
                </div>
                <p>
                  Be the first player to empty your hand. When any player plays their last card, they win the round and score points from cards remaining in opponents' hands.
                </p>
              </div>

              <div className="rule-card-block">
                <div className="rule-sub-head">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <h4>Game Setup & Table Flow</h4>
                </div>
                <ul>
                  <li>Supports <strong>2 to 8 players</strong> seated in a circular table.</li>
                  <li>Each player is dealt <strong>7 cards</strong> at the start.</li>
                  <li>The top card of the deck is flipped to start the center discard pile.</li>
                  <li>Turns proceed in sequence (clockwise by default).</li>
                </ul>
              </div>

              <div className="rule-card-block">
                <div className="rule-sub-head">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <h4>Matching & Playing Cards</h4>
                </div>
                <ul>
                  <li><strong>Match by Color:</strong> Play any card matching the active table color.</li>
                  <li><strong>Match by Number:</strong> Play the same number regardless of color (e.g. Red 7 on Blue 7).</li>
                  <li><strong>Match by Action Symbol:</strong> Play matching action cards (e.g. Red Skip on Green Skip).</li>
                  <li><strong>Wild Cards:</strong> Can be played anytime to declare a new active color.</li>
                  <li><strong>Drawing Cards:</strong> If you have no playable card (or choose not to play), click the <strong>Draw Pile</strong> to draw 1 card.</li>
                </ul>
              </div>

              <div className="rule-card-block deck-recycling-note">
                <div className="rule-sub-head">
                  <RefreshCw size={16} className="text-blue-400" />
                  <h4>Draw-Pile Exhaustion & Reshuffling</h4>
                </div>
                <p>
                  When the draw pile runs out of cards, the top discard card remains in play while all previous cards from the discard pile are automatically shuffled to create a fresh draw pile.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: CARDS */}
          {activeTab === 'cards' && (
            <div className="rules-section-content animate-fadeIn">
              <p className="section-lead">Deck composition & card powers (108 cards total):</p>

              <div className="cards-showcase-grid">
                {/* Number Card */}
                <div className="card-explain-item">
                  <GameCard card={sampleCards.redSeven} size="sm" />
                  <div className="card-explain-text">
                    <h4>Number Cards (0-9)</h4>
                    <p>Matches active color or identical number.</p>
                  </div>
                </div>

                {/* Skip Card */}
                <div className="card-explain-item">
                  <GameCard card={sampleCards.blueSkip} size="sm" />
                  <div className="card-explain-text">
                    <h4>Skip (⊘)</h4>
                    <p>Skips the next player's turn immediately.</p>
                  </div>
                </div>

                {/* Reverse Card */}
                <div className="card-explain-item">
                  <GameCard card={sampleCards.greenRev} size="sm" />
                  <div className="card-explain-text">
                    <h4>Reverse (⇄)</h4>
                    <p>Reverses turn direction (acts as Skip in 2-player duel).</p>
                  </div>
                </div>

                {/* Draw Two Card */}
                <div className="card-explain-item">
                  <GameCard card={sampleCards.yellowD2} size="sm" />
                  <div className="card-explain-text">
                    <h4>Draw Two (+2)</h4>
                    <p>Next player must draw 2 cards and lose turn (or counter if Stacking is ON).</p>
                  </div>
                </div>

                {/* Wild Card */}
                <div className="card-explain-item">
                  <GameCard card={sampleCards.wild} size="sm" />
                  <div className="card-explain-text">
                    <h4>Wild Card (✦)</h4>
                    <p>Playable anytime. You choose the next active color.</p>
                  </div>
                </div>

                {/* Wild Draw Four Card */}
                <div className="card-explain-item">
                  <GameCard card={sampleCards.wildD4} size="sm" />
                  <div className="card-explain-text">
                    <h4>Wild Draw Four (+4)</h4>
                    <p>Choose color & forces next player to draw 4 (or counter if Stacking is ON).</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ROOM CONFIG & HOUSE RULES */}
          {activeTab === 'stacking' && (
            <div className="rules-section-content animate-fadeIn">
              {/* Active Room Stacking Status */}
              <div className="rule-card-block">
                <div className="rule-sub-head">
                  <Flame size={16} className="text-amber-400" />
                  <h4>Draw Card Stacking ({isStackingOn ? 'ACTIVE in Room' : 'OFF in Room'})</h4>
                </div>
                {isStackingOn ? (
                  <div className="stacking-active-guide">
                    <p className="text-emerald-400 font-semibold mb-2">Stacking is ON for this match:</p>
                    <ul>
                      <li><strong className="text-emerald-400">+2 &rarr; +2:</strong> Valid (penalty accumulates to +4)</li>
                      <li><strong className="text-emerald-400">+4 &rarr; +2:</strong> Valid (counter +4 with +2, accumulates to +6)</li>
                      <li><strong className="text-emerald-400">+4 &rarr; +4:</strong> Valid (counter +4 with +4, accumulates to +8)</li>
                      <li><strong className="text-red-400">+2 &rarr; +4:</strong> <span className="text-red-400 font-bold">NOT ALLOWED</span> (cannot counter +2 with +4)</li>
                      <li>The penalty accumulates until a player cannot counter and draws the full stack!</li>
                    </ul>
                  </div>
                ) : (
                  <div className="stacking-off-guide">
                    <p className="text-slate-300">
                      <strong>Stacking is OFF:</strong> Standard rules apply. When +2 or +4 is played, the next player must immediately take the penalty without chaining counter-cards.
                    </p>
                  </div>
                )}
              </div>

              {/* Wild Draw Four Rule */}
              <div className="rule-card-block">
                <div className="rule-sub-head">
                  <Sparkles size={16} className="text-purple-400" />
                  <h4>Wild Draw Four Mode ({isWild4Classic ? 'Classic' : 'Always Allowed'})</h4>
                </div>
                {isWild4Classic ? (
                  <p>
                    <strong>Classic Restriction Active:</strong> Wild Draw Four can ONLY be played if you do NOT hold any card of the active table color in your hand.
                  </p>
                ) : (
                  <p>
                    <strong>Always Allowed Active:</strong> You can play Wild Draw Four anytime, even if you hold cards that match the active color.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: UNO & CATCH UNO */}
          {activeTab === 'uno' && (
            <div className="rules-section-content animate-fadeIn">
              <div className="rule-card-block highlight-block">
                <div className="rule-sub-head">
                  <Sparkles size={16} className="text-amber-400" />
                  <h4>UNO Declaration</h4>
                </div>
                <p>
                  When you play your second-to-last card leaving you with exactly <strong>1 card</strong> in hand, you must click the <strong>[ CALL UNO! ]</strong> button before your turn ends.
                </p>
              </div>

              <div className="rule-card-block">
                <div className="rule-sub-head">
                  <ShieldAlert size={16} className="text-red-400" />
                  <h4>Catching UNO & Penalty</h4>
                </div>
                <p>
                  If a player with 1 card fails to call UNO, opponents can hit <strong>[ CATCH UNO! ]</strong> before the next turn begins. The caught player receives an immediate <strong>2-card penalty</strong> from the draw pile.
                </p>
              </div>

              <div className="rule-card-block">
                <div className="rule-sub-head">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <h4>Safe Protection</h4>
                </div>
                <p>
                  Calling UNO grants a protective shield, preventing any catch penalties while you try to play your final card and win the round.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="rules-panel-footer">
          <button className="rules-done-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default RulesModal;
