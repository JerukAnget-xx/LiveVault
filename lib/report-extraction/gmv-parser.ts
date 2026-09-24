import type {
  OcrBoundingBox,
  OcrDocument,
  OcrLine,
  ReportExtractionResult,
} from './types';

export const ATTRIBUTED_GMV_SOURCE_LABEL = 'Attributed GMV (Rp)' as const;
export const ATTRIBUTED_GMV_METRIC = 'attributed_gmv' as const;
export const NOT_FOUND_METRIC = 'not_found' as const;
export const LOW_CONFIDENCE_BOUNDARY = 0.8;

const ignoredMetricPattern =
  /\b(?:attributed\s+items?\s+sold|live\s+gmv|show\s+gmv|gmv\s+per\s+hour|impressions?|viewers?|ctr|order\s+(?:rate|count)|products?)\b/u;
const groupedValuePattern = /\d{1,3}(?:(?:[.,]\s*|\s+)\d{3}){1,4}|\d{4,15}/gu;

type Candidate = {
  rawGmv: number;
  confidence: number | null;
  score: number;
};

type TextToken = {
  value: string;
  end: number;
};

function normalizedText(value: string) {
  return value
    .toLocaleLowerCase('en-US')
    .replace(/[()]/gu, ' ')
    .replace(/[^a-z0-9.,%\s]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function editDistance(left: string, right: string) {
  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        (current[rightIndex - 1] ?? 0) + 1,
        (previous[rightIndex] ?? 0) + 1,
        (previous[rightIndex - 1] ?? 0) +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }

    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length] ?? Number.POSITIVE_INFINITY;
}

function findAttributedGmvAnchor(text: string) {
  const tokens: TextToken[] = [...text.matchAll(/[a-z0-9]+/gu)].map(
    (match) => ({
      value: match[0],
      end: (match.index ?? 0) + match[0].length,
    }),
  );

  for (let index = 0; index < tokens.length - 1; index += 1) {
    const attributed = tokens[index];
    const gmv = tokens[index + 1];

    if (
      editDistance(attributed.value, 'attributed') <= 2 &&
      editDistance(gmv.value, 'gmv') <= 1
    ) {
      const possibleRp = tokens[index + 2];
      return possibleRp && editDistance(possibleRp.value, 'rp') <= 1
        ? possibleRp.end
        : gmv.end;
    }
  }

  return null;
}

function normalizedConfidence(...values: Array<number | null>) {
  const available = values.filter((value): value is number => value !== null);
  if (available.length === 0) return null;

  const average =
    available.reduce((total, value) => total + value, 0) / available.length;
  return Math.max(0, Math.min(1, average > 1 ? average / 100 : average));
}

function parseNumericToken(token: string) {
  const digits = token.replace(/\D/gu, '');
  const value = Number(digits);

  if (
    digits.length < 4 ||
    digits.length > 15 ||
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    return null;
  }

  return value;
}

function numericCandidates(text: string) {
  const candidates: Array<{ rawGmv: number; index: number }> = [];

  for (const match of text.matchAll(groupedValuePattern)) {
    const index = match.index ?? 0;
    const trailing = text.slice(index + match[0].length).trimStart();

    if (/^[%kmb]/iu.test(trailing)) continue;

    const rawGmv = parseNumericToken(match[0]);
    if (rawGmv !== null) candidates.push({ rawGmv, index });
  }

  return candidates;
}

function boxHeight(box: OcrBoundingBox) {
  return Math.max(1, box.y1 - box.y0);
}

function centerX(box: OcrBoundingBox) {
  return (box.x0 + box.x1) / 2;
}

function spatialScore(anchor: OcrLine, candidate: OcrLine, lineIndex: number) {
  if (!anchor.bbox || !candidate.bbox) return lineIndex * 100;

  const verticalGap = Math.max(0, candidate.bbox.y0 - anchor.bbox.y1);
  const horizontalDistance = Math.abs(
    centerX(candidate.bbox) - centerX(anchor.bbox),
  );
  const allowedVerticalGap = Math.max(180, boxHeight(anchor.bbox) * 8);
  const allowedHorizontalDistance = Math.max(
    320,
    (anchor.bbox.x1 - anchor.bbox.x0) * 1.75,
  );

  if (
    candidate.bbox.y1 < anchor.bbox.y0 - boxHeight(anchor.bbox) ||
    verticalGap > allowedVerticalGap ||
    horizontalDistance > allowedHorizontalDistance
  ) {
    return null;
  }

  return verticalGap + horizontalDistance * 0.35 + lineIndex * 8;
}

function linesFromText(text: string): OcrLine[] {
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ text: line, confidence: null, bbox: null }));
}

function notFound(): ReportExtractionResult {
  return {
    status: 'GMV_NOT_FOUND',
    metric: NOT_FOUND_METRIC,
    rawGmv: null,
    income: null,
    confidence: null,
    verificationRequired: true,
    errorCode: 'NO_GMV_FOUND',
    audit: null,
  };
}

export function normalizeRawGmv(rawGmv: number): number {
  if (!Number.isSafeInteger(rawGmv) || rawGmv <= 0) {
    throw new TypeError('Raw GMV must be a positive safe integer.');
  }

  return Math.floor(rawGmv / 1000);
}

export function formatIncomeIndonesia(income: number): string {
  if (!Number.isSafeInteger(income) || income < 0) {
    throw new TypeError('Income must be a non-negative safe integer.');
  }

  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(income);
}

export function parseAttributedGmvFromOcr(
  input: OcrDocument | string,
): ReportExtractionResult {
  const document: OcrDocument =
    typeof input === 'string'
      ? { text: input, lines: linesFromText(input), region: 'text' }
      : input;
  const lines = document.lines.length
    ? document.lines
    : linesFromText(document.text);
  const candidates: Candidate[] = [];

  lines.forEach((anchorLine, anchorIndex) => {
    const anchorText = normalizedText(anchorLine.text);
    const anchorEnd = findAttributedGmvAnchor(anchorText);
    if (anchorEnd === null) return;

    const sameLineValue = numericCandidates(anchorText.slice(anchorEnd))[0];

    if (sameLineValue) {
      candidates.push({
        rawGmv: sameLineValue.rawGmv,
        confidence: normalizedConfidence(anchorLine.confidence),
        score: 0,
      });
    }

    lines.slice(anchorIndex + 1, anchorIndex + 5).forEach((line, offset) => {
      const lineText = normalizedText(line.text);
      if (ignoredMetricPattern.test(lineText)) return;

      const score = spatialScore(anchorLine, line, offset + 1);
      if (score === null) return;

      for (const numeric of numericCandidates(lineText)) {
        candidates.push({
          rawGmv: numeric.rawGmv,
          confidence: normalizedConfidence(
            anchorLine.confidence,
            line.confidence,
          ),
          score: score + numeric.index / 100,
        });
      }
    });
  });

  const selected = candidates.sort(
    (left, right) => left.score - right.score,
  )[0];
  if (!selected) return notFound();

  const income = normalizeRawGmv(selected.rawGmv);

  return {
    status: 'OK',
    metric: ATTRIBUTED_GMV_METRIC,
    rawGmv: selected.rawGmv,
    income,
    confidence: selected.confidence,
    verificationRequired:
      selected.confidence === null ||
      selected.confidence < LOW_CONFIDENCE_BOUNDARY,
    errorCode: null,
    audit: {
      metric: ATTRIBUTED_GMV_METRIC,
      rawGmv: selected.rawGmv,
      region: document.region,
    },
  };
}
