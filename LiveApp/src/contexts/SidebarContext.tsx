import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type SidebarContextValue = {
  visible: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
  const [visible, setVisible] = useState(false);

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);
  const toggle = useCallback(() => setVisible((v) => !v), []);

  const value = useMemo(
    () => ({ visible, open, close, toggle }),
    [visible, open, close, toggle]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
};

export const useSidebar = () => {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
};
