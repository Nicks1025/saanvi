import React from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import ProtectedRoute from '../../../components/common/ProtectedRoute';
import UnoGameContainer from '../../../features/games/cards/UnoGameContainer';

const UnoGamePage = () => {
  return (
    <ProtectedRoute>
      <AppLayout>
        <UnoGameContainer />
      </AppLayout>
    </ProtectedRoute>
  );
};

export default UnoGamePage;
