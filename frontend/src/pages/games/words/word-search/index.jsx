import React from 'react';
import AppLayout from '../../../../components/layout/AppLayout';
import WordSearchMenu from '../../../../features/games/words/word-search/WordSearchMenu';

const WordSearchPage = () => {
  return (
    <AppLayout>
      <WordSearchMenu />
    </AppLayout>
  );
};

export default WordSearchPage;
