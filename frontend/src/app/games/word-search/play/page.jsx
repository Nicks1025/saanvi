"use client";
import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import WordSearchFeature from '@/features/games/words/word-search/WordSearchFeature';

export default function Page() {
  return (
    <ProtectedRoute requiredPermission="games.words.wordsearch">
      <AppLayout>
        <WordSearchFeature />
      </AppLayout>
    </ProtectedRoute>
  );
}
