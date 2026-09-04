"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import { ArrowPuzzleGame } from '@/features/games/puzzles/arrow-puzzle/ArrowPuzzleGame';
import { SHAPES } from '@/features/games/puzzles/arrow-puzzle/engine/PuzzleEngine';

export default function DynamicArrowPuzzlePage() {
  const params = useParams();
  const router = useRouter();
  
  const shapeParam = params?.shape?.toString().toLowerCase();
  const levelParam = parseInt(params?.level?.toString() || "1", 10);
  
  // Map URL shape back to constant
  const shapeKey = Object.keys(SHAPES).find(k => SHAPES[k].toLowerCase() === shapeParam);
  const initialShape = shapeKey ? SHAPES[shapeKey] : null;

  if (!initialShape) {
    // Invalid shape, redirect to menu
    if (typeof window !== 'undefined') {
      router.push('/games/arrow-puzzle');
    }
    return null;
  }

  return (
    <ProtectedRoute requiredPermission="games.puzzles.arrowpuzzle">
      <AppLayout title={`Arrow Puzzle: ${initialShape}`} gameMode>
        <div style={{ padding: '1rem', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
          <ArrowPuzzleGame initialShape={initialShape} initialLevel={levelParam} />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
