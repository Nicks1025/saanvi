const { v4: uuidv4 } = require('uuid');

const COLORS = ['red', 'blue', 'green', 'yellow'];
const NUMBERS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const ACTIONS = ['skip', 'reverse', 'draw_two'];
const WILDS = ['wild', 'wild_draw_four'];

class UnoEngine {
  
  static generateDeck() {
    const deck = [];
    // Number cards (0 is one per color, 1-9 are two per color)
    for (const color of COLORS) {
      deck.push({ id: uuidv4(), type: 'number', color, value: '0' });
      for (let i = 1; i <= 9; i++) {
        deck.push({ id: uuidv4(), type: 'number', color, value: i.toString() });
        deck.push({ id: uuidv4(), type: 'number', color, value: i.toString() });
      }
      // Action cards (two per color)
      for (const action of ACTIONS) {
        deck.push({ id: uuidv4(), type: action, color, value: action });
        deck.push({ id: uuidv4(), type: action, color, value: action });
      }
    }
    // Wild cards (four each)
    for (let i = 0; i < 4; i++) {
      deck.push({ id: uuidv4(), type: 'wild', color: 'wild', value: 'wild' });
      deck.push({ id: uuidv4(), type: 'wild_draw_four', color: 'wild', value: 'wild_draw_four' });
    }

    return this.shuffle(deck);
  }

  static shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  static startGameState(room) {
    const deck = this.generateDeck();
    
    // Deal 7 cards to each player
    const players = room.players.map(p => {
      const hand = deck.splice(0, 7);
      return { ...p, hand, cardCount: 7, isReady: true };
    });

    // Find first valid discard (cannot be wild draw four usually, but we'll loop until valid number)
    let firstCardIndex = deck.findIndex(c => c.type === 'number');
    if (firstCardIndex === -1) firstCardIndex = 0;
    
    const firstDiscard = deck.splice(firstCardIndex, 1)[0];
    const discardPile = [firstDiscard];

    return {
      ...room,
      status: 'PLAYING',
      players,
      deck,
      discardPile,
      activeColor: firstDiscard.color,
      currentTurnIndex: 0,
      turnDirection: 1, // 1 for clockwise, -1 for counter
      drawStack: 0,     // For accumulated +2 / +4 penalties
    };
  }

  static validatePlay(card, activeColor, topDiscard, roomRules, playerHand) {
    // Basic verification: player actually has the card
    if (!playerHand.find(c => c.id === card.id)) return false;

    // Check Stacking
    if (roomRules.stacking === 'on' && roomRules.drawStack && roomRules.drawStack > 0) {
      if (topDiscard.type === 'draw_two' && card.type === 'draw_two') return true;
      if (topDiscard.type === 'wild_draw_four' && card.type === 'wild_draw_four') return true;
      if (topDiscard.type === 'draw_two' && card.type === 'wild_draw_four') return true;
      // Cannot play +2 on +4
      if (topDiscard.type === 'wild_draw_four' && card.type === 'draw_two') return false;
      return false; // Can only stack or must draw
    }

    if (card.color === 'wild') {
      if (card.type === 'wild_draw_four') {
        if (roomRules.wildDrawFour === 'classic') {
          // Can only play +4 if no cards of activeColor match
          const hasMatchingColor = playerHand.some(c => c.color === activeColor);
          if (hasMatchingColor) return false;
        }
      }
      return true;
    }

    return card.color === activeColor || card.value === topDiscard.value;
  }

  static getNextTurnIndex(currentIndex, direction, playerCount, skipCount = 1) {
    let next = (currentIndex + (direction * skipCount)) % playerCount;
    if (next < 0) next += playerCount;
    return next;
  }

  static applyCardEffect(gameState, card, playedColor) {
    let nextTurnIndex = gameState.currentTurnIndex;
    let turnDirection = gameState.turnDirection;
    let drawStack = gameState.drawStack || 0;
    let skipCount = 1;

    switch (card.type) {
      case 'reverse':
        turnDirection *= -1;
        if (gameState.players.length === 2) {
          skipCount = 2; // In 2-player, Reverse acts as Skip
        }
        break;
      case 'skip':
        skipCount = 2;
        break;
      case 'draw_two':
        drawStack += 2;
        break;
      case 'wild_draw_four':
        drawStack += 4;
        break;
    }

    if (drawStack === 0) {
      nextTurnIndex = this.getNextTurnIndex(gameState.currentTurnIndex, turnDirection, gameState.players.length, skipCount);
    } else {
       if (gameState.rules.stacking === 'off') {
          // Immediately apply draw penalty to next player and skip them
          nextTurnIndex = this.getNextTurnIndex(gameState.currentTurnIndex, turnDirection, gameState.players.length, 1);
       } else {
          // Wait for next player to stack or draw
          nextTurnIndex = this.getNextTurnIndex(gameState.currentTurnIndex, turnDirection, gameState.players.length, 1);
       }
    }

    return {
      activeColor: playedColor || card.color,
      turnDirection,
      drawStack,
      nextTurnIndex,
    };
  }
}

module.exports = UnoEngine;
