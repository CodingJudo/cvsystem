'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DomainCV, Locale } from '@/domain/model/cv';
import { PrintLayout } from '../print-layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PreviewClientProps {
  cv: DomainCV;
}

export function PreviewClient({ cv }: PreviewClientProps) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>(cv.locales[0] ?? 'sv');

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHtml = () => {
    // Get the print layout HTML
    const printContainer = document.getElementById('print-container');
    if (!printContainer) return;

    // Create a complete HTML document
    const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CV - ${cv.name.first} ${cv.name.last}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20mm;
      color: #1a1a1a;
      font-size: 11pt;
      line-height: 1.5;
    }
    .cv-header {
      text-align: center;
      margin-bottom: 24pt;
      border-bottom: 2pt solid #333;
      padding-bottom: 16pt;
    }
    .cv-name {
      font-size: 24pt;
      font-weight: bold;
      margin: 0 0 8pt 0;
      letter-spacing: 0.5pt;
    }
    .cv-title {
      font-size: 14pt;
      color: #444;
      margin: 0;
      font-style: italic;
    }
    .cv-section {
      margin-bottom: 20pt;
    }
    .section-title {
      font-size: 14pt;
      font-weight: bold;
      color: #333;
      margin: 0 0 10pt 0;
      border-bottom: 1pt solid #ccc;
      padding-bottom: 4pt;
      text-transform: uppercase;
      letter-spacing: 1pt;
    }
    .summary-text {
      margin: 0;
      text-align: justify;
    }
    .skills-container {
      display: flex;
      flex-direction: column;
      gap: 6pt;
    }
    .skill-group {
      display: flex;
      flex-wrap: wrap;
      gap: 4pt;
    }
    .skill-level-label {
      font-weight: bold;
      min-width: 100pt;
      color: #555;
    }
    .skill-list { flex: 1; }
    .skill-level, .skill-years {
      color: #666;
      font-size: 9pt;
    }
    .roles-container {
      display: flex;
      flex-direction: column;
      gap: 16pt;
    }
    .print-role { break-inside: avoid; }
    .role-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4pt;
    }
    .role-title-company {
      display: flex;
      flex-direction: column;
    }
    .role-title {
      font-size: 12pt;
      font-weight: bold;
      margin: 0;
    }
    .role-company {
      font-size: 11pt;
      color: #444;
    }
    .role-date {
      font-size: 10pt;
      color: #666;
      white-space: nowrap;
    }
    .role-description {
      margin: 6pt 0 0 0;
      text-align: justify;
      font-size: 10pt;
      color: #333;
    }
    .cv-footer {
      margin-top: 24pt;
      padding-top: 12pt;
      border-top: 1pt solid #ccc;
      text-align: center;
      font-size: 9pt;
      color: #888;
    }
    @media print {
      body { padding: 0; max-width: none; }
      .cv-section { break-inside: avoid; }
      .print-role { break-inside: avoid; }
    }
  </style>
</head>
<body>
${printContainer.innerHTML}
</body>
</html>`;

    // Create download
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cv-${cv.name.first?.toLowerCase()}-${cv.name.last?.toLowerCase()}-${locale}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toolbar - hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/cv')}>
              ← Back to Editor
            </Button>
            <h1 className="text-lg font-semibold">Print Preview</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Language Toggle */}
            <Tabs value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              <TabsList>
                {cv.locales.includes('sv') && (
                  <TabsTrigger value="sv">🇸🇪 SV</TabsTrigger>
                )}
                {cv.locales.includes('en') && (
                  <TabsTrigger value="en">🇬🇧 EN</TabsTrigger>
                )}
              </TabsList>
            </Tabs>

            <Button variant="outline" onClick={handleDownloadHtml}>
              Download HTML
            </Button>
            <Button onClick={handlePrint}>
              Print / Save as PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div className="py-8 print:py-0">
        <div 
          id="print-container"
          className="bg-white shadow-lg mx-auto print:shadow-none print:mx-0"
          style={{ width: '210mm', minHeight: '297mm' }}
        >
          <PrintLayout cv={cv} locale={locale} />
        </div>
      </div>

      {/* Print-specific global styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:py-0 {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:mx-0 {
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
          #print-container {
            width: 100% !important;
          }
        }

        @page {
          size: A4;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
