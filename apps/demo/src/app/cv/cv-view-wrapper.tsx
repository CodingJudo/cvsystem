'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CVView } from '@cvsystem/ui';
import { LocalStorageAdapter } from '@cvsystem/adapters-browser';
import { loadCvFromFixturesAction } from './actions';
import type { DomainCV } from '@cvsystem/core';

interface CVViewWrapperProps {
  cv: DomainCV;
  warnings: string[];
}

export function CVViewWrapper({ cv, warnings }: CVViewWrapperProps) {
  const router = useRouter();
  const storageAdapter = useMemo(() => new LocalStorageAdapter(), []);

  return (
    <CVView
      cv={cv}
      warnings={warnings}
      storageAdapter={storageAdapter}
      onLoadFixtures={loadCvFromFixturesAction}
      onNavigateToPreview={() => router.push('/cv/preview')}
    />
  );
}
