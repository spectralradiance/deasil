import React from 'react';

export interface TocContextValue {
  tocOpen: boolean;
  setTocOpen: (open: boolean) => void;
  hasToc: boolean;
  setHasToc: (has: boolean) => void;
}

export const TocContext = React.createContext<TocContextValue>({
  tocOpen: false,
  setTocOpen: () => {},
  hasToc: false,
  setHasToc: () => {},
});
