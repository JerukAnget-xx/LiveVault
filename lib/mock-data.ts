export type DeliveryStatus = 'Sent' | 'Not sent' | 'Failed';

export type Report = {
  id: string;
  date: string;
  displayDate: string;
  income: number;
  note?: string;
  status: DeliveryStatus;
};

export type ReportCycle = {
  id: string;
  number: number;
  period: string;
  reportCount: number;
};

export const archivedCycles: ReportCycle[] = [
  {
    id: 'cycle-3',
    number: 3,
    period: '28 Sep 2026 - 02 Oct 2026',
    reportCount: 5,
  },
  {
    id: 'cycle-2',
    number: 2,
    period: '01 Sep 2026 - 27 Sep 2026',
    reportCount: 24,
  },
];

export const archivedReports: Record<string, Report[]> = {
  'cycle-3': [
    {
      id: 'c3-1',
      date: '2026-09-28',
      displayDate: '28 / 09',
      income: 10000,
      status: 'Sent',
    },
    {
      id: 'c3-2',
      date: '2026-09-29',
      displayDate: '29 / 09',
      income: 14000,
      status: 'Sent',
    },
    {
      id: 'c3-3',
      date: '2026-09-30',
      displayDate: '30 / 09',
      income: 8200,
      status: 'Sent',
    },
    {
      id: 'c3-4',
      date: '2026-10-01',
      displayDate: '01 / 10',
      income: 12500,
      status: 'Sent',
    },
    {
      id: 'c3-5',
      date: '2026-10-02',
      displayDate: '02 / 10',
      income: 11000,
      status: 'Sent',
    },
  ],
  'cycle-2': [
    {
      id: 'c2-1',
      date: '2026-09-01',
      displayDate: '01 / 09',
      income: 9100,
      status: 'Sent',
    },
    {
      id: 'c2-2',
      date: '2026-09-08',
      displayDate: '08 / 09',
      income: 12000,
      status: 'Sent',
    },
    {
      id: 'c2-3',
      date: '2026-09-17',
      displayDate: '17 / 09',
      income: 10700,
      status: 'Sent',
    },
    {
      id: 'c2-4',
      date: '2026-09-25',
      displayDate: '25 / 09',
      income: 13300,
      status: 'Sent',
    },
  ],
};

export function formatIncome(value: number) {
  return new Intl.NumberFormat('id-ID').format(value);
}

export function formatReportLine(report: Report) {
  const note = report.note ? ` (${report.note})` : '';
  return `${report.displayDate} : ${formatIncome(report.income)}${note}`;
}
