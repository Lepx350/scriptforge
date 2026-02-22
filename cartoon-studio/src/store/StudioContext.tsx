import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { StudioState, StudioAction } from '../types';
import { studioReducer, initialState } from './studioReducer';

interface StudioContextValue {
  state: StudioState;
  dispatch: React.Dispatch<StudioAction>;
}

const StudioContext = createContext<StudioContextValue | null>(null);

export function StudioProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(studioReducer, initialState);

  return (
    <StudioContext.Provider value={{ state, dispatch }}>
      {children}
    </StudioContext.Provider>
  );
}

export function useStudio(): StudioContextValue {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error('useStudio must be used within StudioProvider');
  return ctx;
}
