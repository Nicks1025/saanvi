import React from 'react';
import AppLayout from '../../../../components/layout/AppLayout';
import WordSearchFeature from '../../../../features/games/words/word-search/WordSearchFeature';

const WordSearchPlayPage = () => {
  return (
    <AppLayout>
      <WordSearchFeature />
    </AppLayout>
  );
};

export default WordSearchPlayPage;
