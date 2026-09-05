"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SHAPES } from './engine/PuzzleEngine.js'; // Note: SHAPES will need to be exported from PuzzleEngine now
import { GameBoard } from './components/GameBoard';
import SButton from '@/components/common/SButton';
import axiosClient from '@/services/axios.client.js';
import './arrow-puzzle.css';

export const ArrowPuzzleMenu = () => {
  const router = useRouter();
  const [progress, setProgress] = useState({});
  const [thumbnails, setThumbnails] = useState({});

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await axiosClient.get('/api/games/arrow-puzzle/progress');
        if (res.data) {
          const nextLevels = {};
          // The backend returns uppercase keys (e.g. SQUARE), but the UI uses PascalCase (e.g. Square)
          for (const shape in res.data) {
            const formattedShape = shape.charAt(0).toUpperCase() + shape.slice(1).toLowerCase();
            nextLevels[formattedShape] = res.data[shape] + 1;
          }
          setProgress(nextLevels);
        }
      } catch (e) {
        console.error("Failed to fetch progress", e);
      }
    };
    fetchProgress();
    
    // Fetch Level 1 thumbnails for the menu
    const fetchThumbnails = async () => {
      try {
        const promises = Object.values(SHAPES).map(async (shape) => {
          try {
            const res = await axiosClient.get(`/api/games/arrow-puzzle/generate?shape=${shape}&level=1`);
            const data = res.data || res; // depending on axios response formatting
            return { shape, puzzle: data };
          } catch (e) {
            return null;
          }
        });
        
        const results = await Promise.all(promises);
        const newThumbnails = {};
        results.forEach(res => {
          if (res) newThumbnails[res.shape] = res.puzzle;
        });
        setThumbnails(newThumbnails);
      } catch (err) {
        console.error('Failed to load thumbnails', err);
      }
    };
    fetchThumbnails();
  }, []);

  const handleShapeSelect = (shape) => {
    const startLevel = progress[shape] || 1;
    router.push(`/games/arrow-puzzle/${shape.toLowerCase()}/${startLevel}`);
  };

  return (
    <div className="arrow-puzzle-feature shape-menu">
      <div className="shape-grid">
        {Object.values(SHAPES).map((shape) => (
          <div key={shape} className="shape-card" onClick={() => handleShapeSelect(shape)}>
            <div className="shape-icon-placeholder" style={{ width: '120px', height: '120px', pointerEvents: 'none' }}>
              {thumbnails[shape] ? (
                <GameBoard puzzle={thumbnails[shape]} shape={shape} onObjectTap={() => {}} />
              ) : (
                <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--code-bg)', borderRadius: '8px' }} />
              )}
            </div>
            <p>Level {progress[shape] || 1}</p>
            <SButton icon="play" text="Play" variant="primary" className="play-btn" />
          </div>
        ))}
      </div>
    </div>
  );
};
