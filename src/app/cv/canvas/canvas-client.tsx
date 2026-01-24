'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { DomainCV, Locale } from '@/domain/model/cv';
import { PrintLayout } from '../print-layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { downloadElementAsImage, type ImageFormat } from '@/lib/canvas-export';

interface CanvasClientProps {
  cv: DomainCV;
}

export function CanvasClient({ cv }: CanvasClientProps) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>(cv.locales[0] ?? 'sv');
  const [isExporting, setIsExporting] = useState(false);
  const [scale, setScale] = useState(2);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleExport = async (format: ImageFormat) => {
    if (!contentRef.current) return;
    
    setIsExporting(true);
    try {
      const filename = `cv-${cv.name.first?.toLowerCase()}-${cv.name.last?.toLowerCase()}-${locale}`;
      await downloadElementAsImage(contentRef.current, filename, {
        format,
        scale,
        quality: format === 'jpeg' ? 0.95 : undefined,
      });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/cv')}>
              ← Back to Editor
            </Button>
            <h1 className="text-lg font-semibold">Image Export</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Language Toggle */}
            <Tabs value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              <TabsList>
                {cv.locales.includes('sv') && (
                  <TabsTrigger value="sv">SV</TabsTrigger>
                )}
                {cv.locales.includes('en') && (
                  <TabsTrigger value="en">EN</TabsTrigger>
                )}
              </TabsList>
            </Tabs>

            {/* Quality/Scale Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Quality:</label>
              <select
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value={1}>Standard (1x)</option>
                <option value={2}>High (2x)</option>
                <option value={3}>Ultra (3x)</option>
              </select>
            </div>

            {/* Export Buttons */}
            <Button 
              variant="outline" 
              onClick={() => handleExport('jpeg')}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Download JPG'}
            </Button>
            <Button 
              onClick={() => handleExport('png')}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Download PNG'}
            </Button>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="max-w-5xl mx-auto px-4 py-2">
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-800">
          <strong>Tip:</strong> PNG is best for digital use (sharp text, transparent background possible). 
          JPG is better for printing (smaller file size). Higher quality = larger file.
        </div>
      </div>

      {/* Preview Area */}
      <div className="py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div 
            ref={contentRef}
            className="bg-white shadow-lg mx-auto"
            style={{ width: '210mm', minHeight: '297mm' }}
          >
            <PrintLayout cv={cv} locale={locale} />
          </div>
        </div>
      </div>

      {/* Export Size Info */}
      <div className="max-w-5xl mx-auto px-4 pb-8">
        <div className="text-center text-sm text-gray-500">
          Export resolution: ~{Math.round(210 * 3.78 * scale)} × {Math.round(297 * 3.78 * scale)} pixels (A4 at {scale}x)
        </div>
      </div>
    </div>
  );
}
