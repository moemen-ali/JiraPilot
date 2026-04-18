'use client';

import { useCallback } from 'react';
import { pdf } from '@react-pdf/renderer';
import ReactPdfDocument from '@/components/PdfExporter';

export function usePdfExport() {
  const exportPdf = useCallback(async (content, title) => {
    try {
      const blob = await pdf(
        <ReactPdfDocument content={content} title={title} />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title || 'agent-output'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  }, []);

  return { exportPdf };
}