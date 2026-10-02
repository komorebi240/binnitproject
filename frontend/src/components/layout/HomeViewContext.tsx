"use client";

import { createContext, useContext, useState } from "react";

interface HomeViewContextValue {
  isBoardView: boolean;
  toggleBoardView: () => void;
  setBoardView: (value: boolean) => void;
}

const HomeViewContext = createContext<HomeViewContextValue | null>(null);

/**
 * Lets the header's ☰ icon (dashboard/layout.tsx) toggle how the Home page
 * (app/dashboard/page.tsx) renders, without threading the state through props across the
 * layout/page boundary. Only the Home page reads `isBoardView`; toggling it elsewhere is a
 * harmless no-op visually.
 */
export function HomeViewProvider({ children }: { children: React.ReactNode }) {
  const [isBoardView, setIsBoardView] = useState(false);

  return (
    <HomeViewContext.Provider
      value={{ isBoardView, toggleBoardView: () => setIsBoardView((v) => !v), setBoardView: setIsBoardView }}
    >
      {children}
    </HomeViewContext.Provider>
  );
}

export function useHomeView(): HomeViewContextValue {
  const context = useContext(HomeViewContext);
  if (!context) {
    throw new Error("useHomeView must be used within a HomeViewProvider");
  }
  return context;
}
