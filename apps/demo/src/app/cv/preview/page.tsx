import { loadCvFromFixtures } from '@/domain/cinode/loader';
import { PreviewClient } from './preview-client';

export const metadata = {
  title: 'CV Preview - Print View',
  description: 'Printable CV preview',
};

export const dynamic = 'force-dynamic';

export default async function PreviewPage() {
  const result = await loadCvFromFixtures();

  if (!result.success) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600">Failed to Load CV</h1>
          <p className="mt-2 text-gray-600">{result.error}</p>
        </div>
      </div>
    );
  }

  return <PreviewClient cv={result.data.cv} />;
}
