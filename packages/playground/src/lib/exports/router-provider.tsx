"use client";

import React, { createContext, useContext, ReactNode } from 'react';

export interface RouterContextValue {
  push: (path: string) => void;
  replace: (path: string) => void;
  pathname: string;
  params?: Record<string, string | string[]>;
}

const RouterContext = createContext<RouterContextValue | null>(null);

export interface RouterProviderProps {
  children: ReactNode;
  value: RouterContextValue;
}

export function RouterProvider({ children, value }: RouterProviderProps) {
  return (
    <RouterContext.Provider value={value}>
      {children}
    </RouterContext.Provider>
  );
}

export function usePlaygroundRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    // Return a no-op router if not in context (for components that don't need routing)
    return {
      push: (path: string) => console.log('Router push:', path),
      replace: (path: string) => console.log('Router replace:', path),
      pathname: '/',
      params: {}
    };
  }
  return context;
}

// Helper hook to get current pathname
export function usePlaygroundPathname() {
  const router = usePlaygroundRouter();
  return router.pathname;
}

// Helper hook to get route params
export function usePlaygroundParams() {
  const router = usePlaygroundRouter();
  return router.params || {};
} 