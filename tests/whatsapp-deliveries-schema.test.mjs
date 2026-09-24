import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const schemaUrl = new URL(
  '../db/schema/whatsapp-deliveries.ts',
  import.meta.url,
);
const reportsSchemaUrl = new URL('../db/schema/reports.ts', import.meta.url);

test('WhatsApp delivery stores one nullable message ID', async () => {
  const schema = await readFile(schemaUrl, 'utf8');

  assert.match(schema, /messageId:\s*text\('message_id'\)/u);
  assert.doesNotMatch(schema, /mediaMessageId|textMessageId/u);
  assert.doesNotMatch(schema, /messageId:\s*text\('message_id'\)\.notNull/u);
});

test('WhatsApp attempts retain audit numbering and report cascade', async () => {
  const schema = await readFile(schemaUrl, 'utf8');

  assert.match(
    schema,
    /attemptNumber:\s*integer\('attempt_number'\)\.notNull\(\)/u,
  );
  assert.match(schema, /onDelete:\s*'cascade'/u);
  assert.match(
    schema,
    /uniqueIndex\('whatsapp_deliveries_report_attempt_uidx'\)/u,
  );
  assert.match(schema, /whatsapp_deliveries_attempt_number_positive/u);
});

test('WhatsApp delivery and report summary enums remain unchanged', async () => {
  const [deliverySchema, reportSchema] = await Promise.all([
    readFile(schemaUrl, 'utf8'),
    readFile(reportsSchemaUrl, 'utf8'),
  ]);

  for (const status of ['queued', 'sending', 'sent', 'failed']) {
    assert.match(deliverySchema, new RegExp(`'${status}'`, 'u'));
  }
  assert.doesNotMatch(
    deliverySchema.slice(
      deliverySchema.indexOf('whatsappDeliveryStatusEnum'),
      deliverySchema.indexOf('export const whatsappDeliveries'),
    ),
    /'not_sent'/u,
  );

  for (const status of ['not_sent', 'queued', 'sending', 'sent', 'failed']) {
    assert.match(reportSchema, new RegExp(`'${status}'`, 'u'));
  }
});
