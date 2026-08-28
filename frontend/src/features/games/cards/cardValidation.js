import { CARD_COLORS, CARD_TYPES, STACKING_RULES, WILD_FOUR_RULES } from './types.js';

/**
 * Validates whether a specific card is legally playable given the current table state and rules.
 *
 * @param {Object} card - The card being evaluated
 * @param {Array} hand - The full hand of cards held by the player
 * @param {Object} topCard - The current top discard card
 * @param {string} activeColor - The current active color on the table
 * @param {number} activeStack - The accumulated draw penalty count (0 if no active stack)
 * @param {string|null} pendingPenaltyType - The source card type of current penalty ('draw_two' | 'wild_draw_four')
 * @param {Object} roomRules - The room rules configuration { stacking: 'on'|'off', wildDrawFour: 'classic'|'always_allowed' }
 * @returns {boolean} Whether the card is legally playable
 */
export const isCardLegallyPlayable = ({
  card,
  hand = [],
  topCard = null,
  activeColor = CARD_COLORS.RED,
  activeStack = 0,
  pendingPenaltyType = null,
  roomRules = {
    stacking: STACKING_RULES.ON,
    wildDrawFour: WILD_FOUR_RULES.ALWAYS_ALLOWED,
  },
}) => {
  if (!card || !topCard) return false;

  const isStackingOn = roomRules?.stacking === STACKING_RULES.ON;
  const wildFourRule = roomRules?.wildDrawFour || WILD_FOUR_RULES.ALWAYS_ALLOWED;

  // =========================================================================
  // 1. PRIORITY 1: ACTIVE DRAW PENALTY RESOLUTION (STACKING)
  // =========================================================================
  if (activeStack > 0) {
    // If stacking is disabled, NO counter-play is allowed; player must resolve penalty
    if (!isStackingOn) {
      return false;
    }

    // Determine current pending penalty source (+2 or +4)
    const currentPenalty =
      pendingPenaltyType ||
      (topCard.type === CARD_TYPES.WILD_DRAW_FOUR ? CARD_TYPES.WILD_DRAW_FOUR : CARD_TYPES.DRAW_TWO);

    // If current penalty is +2:
    // +2 is ALLOWED as a stacking response (+2 -> +2 VALID)
    // +4 is ALLOWED as an escalating response (+2 -> +4 VALID)
    if (currentPenalty === CARD_TYPES.DRAW_TWO) {
      return card.type === CARD_TYPES.DRAW_TWO || card.type === CARD_TYPES.WILD_DRAW_FOUR;
    }

    // If current penalty is +4:
    // +2 is NOT ALLOWED as a response (+4 -> +2 INVALID)
    // +4 is ALLOWED as a stacking response (+4 -> +4 VALID)
    if (currentPenalty === CARD_TYPES.WILD_DRAW_FOUR) {
      return card.type === CARD_TYPES.WILD_DRAW_FOUR;
    }

    return false;
  }

  // =========================================================================
  // 2. PRIORITY 2: WILD CARDS (NO ACTIVE DRAW PENALTY)
  // =========================================================================

  // Normal Wild: Always valid
  if (card.type === CARD_TYPES.WILD) {
    return true;
  }

  // Wild Draw Four: Depends on room setting (Classic vs Always Allowed)
  if (card.type === CARD_TYPES.WILD_DRAW_FOUR) {
    if (wildFourRule === WILD_FOUR_RULES.ALWAYS_ALLOWED) {
      return true;
    }

    if (wildFourRule === WILD_FOUR_RULES.CLASSIC) {
      // Classic rule: May ONLY be played if the player has NO card matching the CURRENT ACTIVE COLOR.
      // Checks ONLY whether player has another card with color === activeColor.
      // Does NOT check number or action matches of other cards in hand.
      const hasCardMatchingActiveColor = hand.some(
        (c) => c.id !== card.id && c.color === activeColor
      );

      return !hasCardMatchingActiveColor;
    }

    return true;
  }

  // =========================================================================
  // 3. PRIORITY 3: NORMAL NUMBER & ACTION CARDS
  // =========================================================================
  // A normal card can be played ONLY when at least ONE of the following is true:
  // 1. Same Color as the current active color.
  // 2. Same Number as top card, when top card is a numbered card.
  // 3. Same Action / Symbol as top card, when top card is an action card.

  // 1. Same Color
  if (card.color === activeColor) {
    return true;
  }

  // 2. Same Number (strictly for numbered cards matching by number)
  if (
    card.type === CARD_TYPES.NUMBER &&
    topCard.type === CARD_TYPES.NUMBER &&
    card.value === topCard.value
  ) {
    return true;
  }

  // 3. Same Action / Symbol (strictly for matching action cards: Skip on Skip, Reverse on Reverse, Draw Two on Draw Two)
  const ACTION_TYPES = [CARD_TYPES.SKIP, CARD_TYPES.REVERSE, CARD_TYPES.DRAW_TWO];
  if (
    ACTION_TYPES.includes(card.type) &&
    ACTION_TYPES.includes(topCard.type) &&
    card.type === topCard.type
  ) {
    return true;
  }

  return false;
};

/**
 * Returns an array of playable card IDs for the given hand.
 */
export const getPlayableCardIds = (
  hand = [],
  topCard = null,
  activeColor = CARD_COLORS.RED,
  activeStack = 0,
  pendingPenaltyType = null,
  roomRules = {
    stacking: STACKING_RULES.ON,
    wildDrawFour: WILD_FOUR_RULES.ALWAYS_ALLOWED,
  }
) => {
  if (!topCard || !Array.isArray(hand)) return [];

  return hand
    .filter((card) =>
      isCardLegallyPlayable({
        card,
        hand,
        topCard,
        activeColor,
        activeStack,
        pendingPenaltyType,
        roomRules,
      })
    )
    .map((c) => c.id);
};
