import React from 'react';
import AppLayout from '../../../../components/layout/AppLayout';
import ProtectedRoute from '../../../../components/common/ProtectedRoute';
import WordSearchMenu from '../../../../features/games/words/word-search/WordSearchMenu';

const WordSearchPage = () => {
  return (
    <ProtectedRoute requiredPermission="games.words.wordsearch">
      <AppLayout>
        <WordSearchMenu />
      </AppLayout>
    </ProtectedRoute>
  );
};

export default WordSearchPage;
