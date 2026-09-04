"use client";

import { ArrowPuzzleMenu } from '@/features/games/puzzles/arrow-puzzle/ArrowPuzzleMenu';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function ArrowPuzzlePage() {
  return (
    <ProtectedRoute requiredPermission="games.puzzles.arrowpuzzle">
      <AppLayout title="Arrow Puzzle" gameMode>
        <div style={{ padding: '1rem', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
          <ArrowPuzzleMenu />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
