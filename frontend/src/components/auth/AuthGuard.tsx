'use client';

import React from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  // Simplified auth guard - let individual pages handle their own auth logic
  return <>{children}</>;
}