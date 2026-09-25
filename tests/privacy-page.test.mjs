import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const privacyPageUrl = new URL('../app/privacy/page.tsx', import.meta.url);
const protectedLayoutUrl = new URL(
  '../app/(protected)/layout.tsx',
  import.meta.url,
);

test('privacy page is public and does not validate an auth session', async () => {
  const source = await readFile(privacyPageUrl, 'utf8');

  assert.doesNotMatch(
    source,
    /requireSession|requireApiSession|getServerSession|redirect\(['"]\/login/u,
  );
});

test('privacy page contains the required operational disclosures', async () => {
  const source = await readFile(privacyPageUrl, 'utf8');

  for (const disclosure of [
    'Tesseract.js',
    'Supabase Storage',
    'PostgreSQL',
    'WhatsApp Business Platform',
    '[CONTACT_EMAIL]',
    '25 September 2026',
  ]) {
    assert.match(source, new RegExp(disclosure.replace(/[.]/gu, '\\$&'), 'u'));
  }
});

test('existing application route group remains server-side protected', async () => {
  const source = await readFile(protectedLayoutUrl, 'utf8');

  assert.match(source, /await requireSession\(\)/u);
});
