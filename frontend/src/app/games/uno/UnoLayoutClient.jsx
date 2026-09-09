"use client";
import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import UnoGameContainer from '@/features/games/cards/UnoGameContainer';

export default function UnoLayoutClient({ children }) {
  return (
    <ProtectedRoute requiredPermission="games.uno">
      <AppLayout>
        <UnoGameContainer />
        {children}
      </AppLayout>
    </ProtectedRoute>
  );
}
