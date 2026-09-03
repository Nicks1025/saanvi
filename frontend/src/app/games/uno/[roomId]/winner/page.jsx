"use client";
import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import UnoGameContainer from '@/features/games/cards/UnoGameContainer';

export default function Page() {
  return (
    <ProtectedRoute requiredPermission="games.uno">
      <AppLayout>
        <UnoGameContainer />
      </AppLayout>
    </ProtectedRoute>
  );
}
