// UNO - Types, Constants, and Deck Generator

export const CARD_COLORS = {
  RED: 'red',
  BLUE: 'blue',
  GREEN: 'green',
  YELLOW: 'yellow',
  WILD: 'wild',
};

export const COLOR_METADATA = {
  [CARD_COLORS.RED]: {
    name: 'Red',
    hex: '#ef4444',
    bgGradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
    badgeClass: 'color-red',
    label: 'Red',
  },
  [CARD_COLORS.BLUE]: {
    name: 'Blue',
    hex: '#3b82f6',
    bgGradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    badgeClass: 'color-blue',
    label: 'Blue',
  },
  [CARD_COLORS.GREEN]: {
    name: 'Green',
    hex: '#10b981',
    bgGradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
    badgeClass: 'color-green',
    label: 'Green',
  },
  [CARD_COLORS.YELLOW]: {
    name: 'Yellow',
    hex: '#f59e0b',
    bgGradient: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
    badgeClass: 'color-yellow',
    label: 'Yellow',
  },
  [CARD_COLORS.WILD]: {
    name: 'Wild',
    hex: '#8b5cf6',
    bgGradient: 'linear-gradient(135deg, #ec4899, #8b5cf6, #3b82f6, #10b981, #f59e0b)',
    badgeClass: 'color-wild',
    label: 'Wild',
  },
};

export const CARD_TYPES = {
  NUMBER: 'number',
  SKIP: 'skip',
  REVERSE: 'reverse',
  DRAW_TWO: 'draw_two',
  WILD: 'wild',
  WILD_DRAW_FOUR: 'wild_draw_four',
};

export const GAME_SCREENS = {
  LOBBY: 'lobby',
  CREATE: 'create',
  JOIN: 'join',
  WAITING_ROOM: 'waiting_room',
  GAME_TABLE: 'game_table',
  RESULT: 'result',
};

export const STACKING_RULES = {
  OFF: 'off',
  ON: 'on',
};

export const WILD_FOUR_RULES = {
  CLASSIC: 'classic',
  ALWAYS_ALLOWED: 'always_allowed',
};

// Generate standard 108-card deck
export const createStandardDeck = () => {
  const deck = [];
  const colors = [CARD_COLORS.RED, CARD_COLORS.BLUE, CARD_COLORS.GREEN, CARD_COLORS.YELLOW];
  let id = 1;

  colors.forEach((color) => {
    // One 0 per color
    deck.push({
      id: `card-${id++}`,
      color,
      type: CARD_TYPES.NUMBER,
      value: 0,
      label: '0',
    });

    // Two of 1-9 per color
    for (let num = 1; num <= 9; num++) {
      for (let i = 0; i < 2; i++) {
        deck.push({
          id: `card-${id++}`,
          color,
          type: CARD_TYPES.NUMBER,
          value: num,
          label: `${num}`,
        });
      }
    }

    // Two of each action card per color
    for (let i = 0; i < 2; i++) {
      deck.push({
        id: `card-${id++}`,
        color,
        type: CARD_TYPES.SKIP,
        value: 20,
        label: '⊘',
      });
      deck.push({
        id: `card-${id++}`,
        color,
        type: CARD_TYPES.REVERSE,
        value: 20,
        label: '⇄',
      });
      deck.push({
        id: `card-${id++}`,
        color,
        type: CARD_TYPES.DRAW_TWO,
        value: 20,
        label: '+2',
      });
    }
  });

  // 4 Wild cards
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: `card-${id++}`,
      color: CARD_COLORS.WILD,
      type: CARD_TYPES.WILD,
      value: 50,
      label: '✦',
    });
  }

  // 4 Wild Draw Four cards
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: `card-${id++}`,
      color: CARD_COLORS.WILD,
      type: CARD_TYPES.WILD_DRAW_FOUR,
      value: 50,
      label: '+4',
    });
  }

  return shuffleDeck(deck);
};

export const shuffleDeck = (deck) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

