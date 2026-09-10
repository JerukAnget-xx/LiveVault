import { RecipientSelection } from '@/components/recipient-selection';

const recipients = [
  {
    id: 'alif',
    name: 'Alif Pratama',
    reportTitle: 'ALIF LIVE',
    reportCount: 12,
    initials: 'AP',
  },
  {
    id: 'bambang',
    name: 'Bambang Setiawan',
    reportTitle: 'BAMBANG LIVE',
    reportCount: 9,
    initials: 'BS',
  },
  {
    id: 'citra',
    name: 'Citra Maharani',
    reportTitle: 'CITRA LIVE',
    reportCount: 14,
    initials: 'CM',
  },
  {
    id: 'dimas',
    name: 'Dimas Nugraha',
    reportTitle: 'DIMAS LIVE',
    reportCount: 7,
    initials: 'DN',
  },
];

export default function Home() {
  return <RecipientSelection recipients={recipients} />;
}
