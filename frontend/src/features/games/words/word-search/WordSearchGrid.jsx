import React, { useState, useEffect, useRef } from 'react';

const WordSearchGrid = ({ grid, onValidate, onHint }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startCell, setStartCell] = useState(null);
  const [currentCell, setCurrentCell] = useState(null);
  const [selectedLine, setSelectedLine] = useState([]);
  const [wrongLine, setWrongLine] = useState([]);
  const [foundLines, setFoundLines] = useState([]); // Array of arrays of {r, c}
  const [feedback, setFeedback] = useState(null); // 'correct', 'incorrect'
  const [hintCell, setHintCell] = useState(null);
  const gridRef = useRef(null);

  useEffect(() => {
    if (isDragging && startCell && currentCell) {
      const line = calculateLine(startCell, currentCell);
      setSelectedLine(line);
    } else {
      setSelectedLine([]);
    }
  }, [isDragging, startCell, currentCell]);

  const calculateLine = (start, end) => {
    const dr = end.r - start.r;
    const dc = end.c - start.c;
    
    // Check if it's a valid line (straight or exact diagonal)
    if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) {
      return []; // Invalid line
    }

    const steps = Math.max(Math.abs(dr), Math.abs(dc));
    const stepR = dr === 0 ? 0 : dr / steps;
    const stepC = dc === 0 ? 0 : dc / steps;

    const line = [];
    for (let i = 0; i <= steps; i++) {
      line.push({
        r: start.r + stepR * i,
        c: start.c + stepC * i
      });
    }
    return line;
  };

  const handlePointerDown = (r, c, e) => {
    // Prevent default touch behavior like scrolling
    if (e.cancelable) e.preventDefault();
    setIsDragging(true);
    setStartCell({ r, c });
    setCurrentCell({ r, c });
    setFeedback(null);
    setWrongLine([]);
    setHintCell(null);
  };

  const handlePointerMove = (r, c, e) => {
    if (!isDragging) return;
    if (e.cancelable) e.preventDefault();
    setCurrentCell({ r, c });
  };

  const handlePointerUp = async () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (selectedLine.length > 0) {
      const start = { row: startCell.r, column: startCell.c };
      const end = { row: currentCell.r, column: currentCell.c };
      
      const res = await onValidate(start, end);
      if (res.correct) {
        setFoundLines(prev => [...prev, selectedLine]);
        setFeedback('correct');
      } else {
        setFeedback('incorrect');
        setWrongLine(selectedLine);
        setTimeout(() => {
          setFeedback(null);
          setWrongLine([]);
        }, 1000);
      }
    }
    
    setStartCell(null);
    setCurrentCell(null);
    setSelectedLine([]);
  };

  // For touch devices, pointer-events: none on cells allows touchmove to register on the container
  // and we can calculate which cell is under the finger.
  const handleTouchMove = (e) => {
    if (!isDragging) return;
    if (e.cancelable) e.preventDefault();
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element && element.dataset.r !== undefined && element.dataset.c !== undefined) {
      setCurrentCell({ r: parseInt(element.dataset.r), c: parseInt(element.dataset.c) });
    }
  };

  const isCellInLine = (r, c, line) => {
    return line.some(cell => cell.r === r && cell.c === c);
  };

  const isCellFound = (r, c) => {
    return foundLines.some(line => isCellInLine(r, c, line));
  };

  const handleHintClick = async () => {
    const hint = await onHint();
    if (hint) {
      setHintCell({ r: hint.startRow, c: hint.startColumn });
      setTimeout(() => setHintCell(null), 3000); // Clear after 3s
    }
  };

  const gridSize = grid.length;

  return (
    <div className="ws-grid-container">
      <div 
        className={`ws-grid ws-grid-${gridSize}`}
        ref={gridRef}
        onMouseLeave={handlePointerUp}
        onMouseUp={handlePointerUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handlePointerUp}
        onTouchCancel={handlePointerUp}
      >
        {grid.map((row, r) => (
          row.map((letter, c) => {
            const inCurrentLine = isCellInLine(r, c, selectedLine);
            const inWrongLine = isCellInLine(r, c, wrongLine);
            const isFound = isCellFound(r, c);
            const isHint = hintCell && hintCell.r === r && hintCell.c === c;
            
            let classes = "ws-cell";
            if (isFound) classes += " found";
            if (inCurrentLine) {
              classes += " selected";
            }
            if (inWrongLine && feedback === 'incorrect') {
              classes += " incorrect";
            }
            if (isHint) classes += " hint";

            return (
              <div 
                key={`${r}-${c}`}
                data-r={r}
                data-c={c}
                className={classes}
                onMouseDown={(e) => handlePointerDown(r, c, e)}
                onMouseEnter={(e) => handlePointerMove(r, c, e)}
                onTouchStart={(e) => handlePointerDown(r, c, e)}
              >
                {letter}
              </div>
            );
          })
        ))}
      </div>
      <div className="ws-controls">
        <button className="s-button" onClick={handleHintClick}>Hint</button>
      </div>
    </div>
  );
};

export default WordSearchGrid;
