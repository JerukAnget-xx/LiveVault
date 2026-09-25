import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Vault } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Kebijakan Privasi',
  description:
    'Kebijakan Privasi Live.Vault untuk pemrosesan laporan operasional dan pengiriman WhatsApp.',
  alternates: {
    canonical: 'https://live-vault.vercel.app/privacy',
  },
};

const policySections = [
  { id: 'informasi', label: 'Informasi yang diproses' },
  { id: 'tujuan', label: 'Tujuan pemrosesan' },
  { id: 'screenshot', label: 'Pemrosesan screenshot' },
  { id: 'penyimpanan', label: 'Penyimpanan data' },
  { id: 'retensi', label: 'Retensi data' },
  { id: 'whatsapp', label: 'Pengiriman WhatsApp' },
  { id: 'berbagi-data', label: 'Berbagi data' },
  { id: 'keamanan', label: 'Keamanan' },
  { id: 'hak-kontak', label: 'Hak dan kontak' },
  { id: 'pembaruan', label: 'Pembaruan kebijakan' },
];

const informationItems = [
  'nama penerima laporan',
  'nomor WhatsApp penerima',
  'screenshot laporan',
  'tanggal dan nilai pendapatan laporan',
  'catatan laporan yang bersifat opsional',
  'informasi siklus dan riwayat laporan',
  'informasi autentikasi dan sesi administrator',
  'status pengiriman WhatsApp dan pengenal pesan',
];

const purposeItems = [
  'mengelola laporan operasional',
  'mengekstrak nilai laporan secara lokal melalui OCR di browser',
  'menyimpan dan menampilkan riwayat laporan',
  'menampilkan daftar laporan kumulatif',
  'mengirim laporan melalui WhatsApp Business Platform',
  'menjaga keamanan aplikasi dan autentikasi administrator',
];

export default function PrivacyPage() {
  return (
    <main
      lang="id"
      className="min-h-[100dvh] bg-background text-foreground selection:bg-primary/25"
    >
      <header className="border-b border-border/80">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between gap-5 px-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
              <Vault className="size-4.5" aria-hidden="true" />
            </span>
            <span className="font-mono text-sm font-semibold tracking-[0.18em]">
              LIVE.VAULT
            </span>
          </div>

          <Link
            href="/login"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Kembali ke login
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
        <section aria-labelledby="privacy-title" className="max-w-3xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Live.Vault
          </p>
          <h1
            id="privacy-title"
            className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl"
          >
            Privacy Policy / Kebijakan Privasi
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Kebijakan ini menjelaskan cara Live.Vault memproses dan melindungi
            data untuk kegiatan laporan operasional.
          </p>
          <p className="mt-5 text-sm font-medium text-foreground">
            Terakhir diperbarui: 25 September 2026
          </p>
        </section>

        <div className="mt-12 grid items-start gap-12 border-t border-border/80 pt-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
          <aside className="lg:sticky lg:top-8">
            <h2 className="text-sm font-semibold">Dalam kebijakan ini</h2>
            <nav className="mt-4" aria-label="Daftar bagian kebijakan privasi">
              <ol className="space-y-2 text-sm text-muted-foreground">
                {policySections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="block rounded-md py-1.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {section.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article className="min-w-0 max-w-3xl space-y-12 text-sm leading-7 text-muted-foreground sm:text-[15px]">
            <section id="informasi" className="scroll-mt-8">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Informasi yang diproses
              </h2>
              <p className="mt-3">
                Live.Vault dapat memproses informasi berikut ketika digunakan
                oleh administrator:
              </p>
              <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {informationItems.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span
                      className="mt-[0.7rem] h-px w-4 shrink-0 bg-primary/70"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section id="tujuan" className="scroll-mt-8">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Tujuan pemrosesan
              </h2>
              <p className="mt-3">
                Data hanya diproses untuk mendukung fungsi operasional berikut:
              </p>
              <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {purposeItems.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span
                      className="mt-[0.7rem] h-px w-4 shrink-0 bg-primary/70"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section id="screenshot" className="scroll-mt-8">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Pemrosesan screenshot
              </h2>
              <p className="mt-3">
                OCR dijalankan secara lokal di browser pengguna menggunakan
                Tesseract.js. Screenshot tidak dikirim ke penyedia AI eksternal
                untuk proses OCR. Setelah laporan dikirimkan, screenshot dapat
                diunggah ke Supabase Storage privat sebagai bagian dari
                penyimpanan laporan.
              </p>
            </section>

            <section id="penyimpanan" className="scroll-mt-8">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Penyimpanan data
              </h2>
              <p className="mt-3">
                Data aplikasi disimpan menggunakan PostgreSQL dan layanan
                Supabase. Screenshot disimpan dalam bucket Supabase Storage
                privat dan tidak dimaksudkan untuk diekspos melalui URL permanen
                yang dapat diakses umum.
              </p>
            </section>

            <section id="retensi" className="scroll-mt-8">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Retensi data
              </h2>
              <p className="mt-3">
                Kebijakan retensi laporan mencakup bulan kalender berjalan dan
                dua bulan kalender sebelumnya. Data laporan dan screenshot yang
                lebih lama serta memenuhi syarat dapat dihapus secara otomatis
                ketika proses pembersihan retensi dijalankan. Metadata audit
                siklus laporan dapat dipertahankan untuk kebutuhan operasional
                dan audit apabila diperlukan.
              </p>
            </section>

            <section id="whatsapp" className="scroll-mt-8">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Pengiriman WhatsApp
              </h2>
              <p className="mt-3">
                Live.Vault menggunakan WhatsApp Business Platform yang
                disediakan oleh Meta untuk mengirim pesan laporan. Informasi
                penerima yang relevan, screenshot, dan isi pesan laporan dapat
                diproses oleh Meta atau WhatsApp ketika pesan dikirim.
              </p>
            </section>

            <section id="berbagi-data" className="scroll-mt-8">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Berbagi data
              </h2>
              <p className="mt-3">
                Live.Vault tidak menjual informasi pribadi. Data hanya dibagikan
                kepada penyedia layanan yang diperlukan untuk mengoperasikan
                aplikasi, yaitu Supabase, Vercel, serta Meta atau WhatsApp
                Business Platform.
              </p>
            </section>

            <section id="keamanan" className="scroll-mt-8">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Keamanan
              </h2>
              <p className="mt-3">
                Live.Vault menerapkan kontrol akses sisi server, autentikasi,
                penyimpanan privat, dan pembatasan akses terhadap kredensial
                serta rahasia aplikasi. Langkah yang wajar diterapkan untuk
                melindungi data, tetapi tidak ada sistem yang dapat menjamin
                keamanan secara mutlak.
              </p>
            </section>

            <section id="hak-kontak" className="scroll-mt-8">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Hak dan kontak
              </h2>
              <p className="mt-3">
                Pengguna dapat menghubungi administrator Live.Vault untuk
                meminta akses, koreksi, atau penghapusan data yang relevan.
                Gunakan alamat kontak berikut:{' '}
                <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs text-foreground">
                  [CONTACT_EMAIL]
                </span>
                .
              </p>
            </section>

            <section id="pembaruan" className="scroll-mt-8">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Pembaruan kebijakan
              </h2>
              <p className="mt-3">
                Kebijakan Privasi ini dapat diperbarui ketika perilaku aplikasi,
                proses operasional, atau integrasi layanan berubah. Tanggal
                pembaruan terbaru akan ditampilkan pada bagian atas halaman.
              </p>
            </section>
          </article>
        </div>
      </div>
    </main>
  );
}
