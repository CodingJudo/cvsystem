import { loadCvFromFixtures } from '@/domain/cinode/loader';
import { CanvasClient } from './canvas-client';

export const metadata = {
  title: 'CV Canvas Export - Image Export',
  description: 'Export CV as image',
};

export const dynamic = 'force-dynamic';

export default async function CanvasPage() {
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

  return <CanvasClient cv={result.data.cv} />;
}
