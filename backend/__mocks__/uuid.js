let mockCounter = 1;

module.exports = {
  v4: () => {
    const hex = (mockCounter++).toString(16).padStart(12, '0');
    return `00000000-0000-4000-8000-${hex}`;
  }
};
