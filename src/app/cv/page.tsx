import { loadCvFromFixtures } from '@/domain/cinode/loader';
import { CVView } from './cv-view';

export const metadata = {
  title: 'CV Overview',
  description: 'View your CV data extracted from Cinode',
};

// Ensure this page is always fresh in development
export const dynamic = 'force-dynamic';

export default async function CVPage() {
  const result = await loadCvFromFixtures();

  if (!result.success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950">
          <h1 className="text-xl font-semibold text-red-800 dark:text-red-200">
            Failed to Load CV
          </h1>
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">
            {result.error}
          </p>
          <p className="mt-4 text-xs text-red-600 dark:text-red-400">
            Make sure you have placed your Cinode CV JSON exports in:
            <br />
            <code className="mt-1 block rounded bg-red-100 px-2 py-1 dark:bg-red-900">
              fixtures/cinode/cv-sv.json
              <br />
              fixtures/cinode/cv-en.json
            </code>
          </p>
        </div>
      </div>
    );
  }

  const { cv, warnings } = result.data;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <CVView cv={cv} warnings={warnings} />
    </div>
  );
}
