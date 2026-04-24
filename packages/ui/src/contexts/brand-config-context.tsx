'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { BrandConfig } from '@cvsystem/core';
import { DEFAULT_BRAND_CONFIG } from '@cvsystem/core';

const BrandConfigContext = createContext<BrandConfig>(DEFAULT_BRAND_CONFIG);

export function BrandConfigProvider({
  config,
  children,
}: {
  config: BrandConfig;
  children: ReactNode;
}) {
  return (
    <BrandConfigContext.Provider value={config}>
      {children}
    </BrandConfigContext.Provider>
  );
}

export function useBrandConfig(): BrandConfig {
  return useContext(BrandConfigContext);
}
