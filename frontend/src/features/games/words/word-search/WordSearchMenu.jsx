import React from 'react';
import { useNavigate } from 'react-router-dom';
import './wordSearch.css';

const WordSearchMenu = () => {
  const navigate = useNavigate();

  const handleStart = (difficulty) => {
    navigate(`/games/word-search/play?difficulty=${difficulty}`);
  };

  return (
    <div className="ws-container">
      <div className="ws-menu">
        <h2>Select Difficulty</h2>
        <div className="ws-menu-buttons">
          <button className="s-button btn-primary" onClick={() => handleStart('easy')}>Easy (8x8)</button>
          <button className="s-button btn-primary" onClick={() => handleStart('medium')}>Medium (10x10)</button>
          <button className="s-button btn-primary" onClick={() => handleStart('hard')}>Hard (12x12)</button>
        </div>
      </div>
    </div>
  );
};

export default WordSearchMenu;
