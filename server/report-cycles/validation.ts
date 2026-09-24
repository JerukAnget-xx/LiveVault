import { z } from 'zod';

const resetReportCycleSchema = z.object({ expectedCycleId: z.uuid() }).strict();

export class ReportCycleValidationError extends Error {
  constructor() {
    super('A valid expected active-cycle ID is required.');
    this.name = 'ReportCycleValidationError';
  }
}

export async function parseResetReportCycleRequest(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new ReportCycleValidationError();
  }

  const result = resetReportCycleSchema.safeParse(body);
  if (!result.success) throw new ReportCycleValidationError();
  return result.data;
}
