export type OcrBoundingBox = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

export type OcrLine = {
  text: string;
  confidence: number | null;
  bbox: OcrBoundingBox | null;
};

export type OcrDocument = {
  text: string;
  lines: OcrLine[];
  region: 'summary' | 'full' | 'text';
};

export type OcrProgress = {
  status: string;
  progress: number;
};

export type ReportExtractionResult = {
  status: 'OK' | 'GMV_NOT_FOUND';
  metric: 'attributed_gmv' | 'not_found';
  rawGmv: number | null;
  income: number | null;
  confidence: number | null;
  verificationRequired: boolean;
  errorCode: 'NO_GMV_FOUND' | 'VALUE_VALIDATION_FAILED' | null;
  audit: {
    metric: 'attributed_gmv';
    rawGmv: number;
    region: OcrDocument['region'];
  } | null;
};
