import type { CumulativeReport } from './types.ts';

function formatReportDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) throw new Error('Invalid report calendar date');
  return `${match[3]} / ${match[2]}`;
}

export function formatWhatsAppIncome(value: number) {
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(value);
}

export function generateCumulativeReportList(
  reportTitle: string,
  reports: CumulativeReport[],
) {
  const ordered = reports.toSorted(
    (left, right) =>
      left.reportDate.localeCompare(right.reportDate) ||
      left.createdAt.getTime() - right.createdAt.getTime() ||
      left.id.localeCompare(right.id),
  );
  const lines = ordered.map(
    (report) =>
      `${formatReportDate(report.reportDate)} : ${formatWhatsAppIncome(report.income)}`,
  );
  return [`// ${reportTitle.trim()} :`, '', ...lines].join('\n');
}

export function buildTemplateMessagePayload(input: {
  to: string;
  mediaId: string;
  reportTitle: string;
  reportList: string;
  templateName: string;
  templateLanguage: string;
}) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: input.to,
    type: 'template',
    template: {
      name: input.templateName,
      language: { code: input.templateLanguage },
      components: [
        {
          type: 'header',
          parameters: [{ type: 'image', image: { id: input.mediaId } }],
        },
        {
          type: 'body',
          parameters: [
            { type: 'text', text: input.reportTitle },
            { type: 'text', text: input.reportList },
          ],
        },
      ],
    },
  } as const;
}
