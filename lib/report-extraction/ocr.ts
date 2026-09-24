import 'client-only';

import type { Block, Page, Rectangle } from 'tesseract.js';

import { parseAttributedGmvFromOcr } from './gmv-parser';
import type {
  OcrDocument,
  OcrLine,
  OcrProgress,
  ReportExtractionResult,
} from './types';

export class LocalOcrError extends Error {
  constructor() {
    super('The screenshot could not be read locally.');
    this.name = 'LocalOcrError';
  }
}

function linesFromBlocks(blocks: Block[] | null): OcrLine[] {
  if (!blocks) return [];

  return blocks.flatMap((block) =>
    block.paragraphs.flatMap((paragraph) =>
      paragraph.lines.map((line) => ({
        text: line.text,
        confidence: line.confidence,
        bbox: line.bbox,
      })),
    ),
  );
}

function toDocument(page: Page, region: OcrDocument['region']): OcrDocument {
  return {
    text: page.text,
    lines: linesFromBlocks(page.blocks),
    region,
  };
}

async function summaryRectangle(image: File): Promise<Rectangle> {
  const bitmap = await createImageBitmap(image);

  try {
    return {
      left: Math.floor(bitmap.width * 0.16),
      top: 0,
      width: Math.max(1, Math.floor(bitmap.width * 0.62)),
      height: Math.max(1, Math.floor(bitmap.height * 0.65)),
    };
  } finally {
    bitmap.close();
  }
}

export async function extractReportLocally(
  image: File,
  onProgress?: (progress: OcrProgress) => void,
): Promise<ReportExtractionResult> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', undefined, {
    logger(message) {
      onProgress?.({ status: message.status, progress: message.progress });
    },
  });

  try {
    await worker.setParameters({ preserve_interword_spaces: '1' });
    const rectangle = await summaryRectangle(image);
    const summary = await worker.recognize(
      image,
      { rectangle },
      { text: true, blocks: true },
    );
    const summaryResult = parseAttributedGmvFromOcr(
      toDocument(summary.data, 'summary'),
    );

    if (summaryResult.status === 'OK') return summaryResult;

    const full = await worker.recognize(
      image,
      {},
      { text: true, blocks: true },
    );
    return parseAttributedGmvFromOcr(toDocument(full.data, 'full'));
  } catch {
    throw new LocalOcrError();
  } finally {
    await worker.terminate();
  }
}
