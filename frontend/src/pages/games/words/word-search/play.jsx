import React from 'react';
import AppLayout from '../../../../components/layout/AppLayout';
import ProtectedRoute from '../../../../components/common/ProtectedRoute';
import WordSearchFeature from '../../../../features/games/words/word-search/WordSearchFeature';

const WordSearchPlayPage = () => {
  return (
    <ProtectedRoute requiredPermission="games.words.wordsearch">
      <AppLayout>
        <WordSearchFeature />
      </AppLayout>
    </ProtectedRoute>
  );
};

export default WordSearchPlayPage;
