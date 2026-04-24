import { createMinimalCv } from '@cvsystem/core';
import { CVViewWrapper } from './cv-view-wrapper';

export const metadata = {
  title: 'CV Overview',
  description: 'View your CV data extracted from Cinode',
};

// Ensure this page is always fresh in development
export const dynamic = 'force-dynamic';

export default async function CVPage() {
  // Start with a minimal CV; user imports from fixtures or file when they want data
  const cv = createMinimalCv();
  const warnings: string[] = [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <CVViewWrapper cv={cv} warnings={warnings} />
    </div>
  );
}
