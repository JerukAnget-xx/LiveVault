import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRecipientService,
  RecipientNotFoundError,
} from '../server/recipients/service.ts';
import {
  parseCreateRecipient,
  parseUpdateRecipient,
  RecipientValidationError,
} from '../server/recipients/validation.ts';

const recipientId = '11111111-1111-4111-8111-111111111111';
const now = new Date('2026-09-11T00:00:00.000Z');

function createTestRepository(initialRecipients = []) {
  const rows = initialRecipients.map((recipient) => ({ ...recipient }));

  return {
    async list({ activeOnly }) {
      return rows
        .filter((recipient) => !activeOnly || recipient.isActive)
        .toSorted((left, right) => left.name.localeCompare(right.name));
    },
    async findById(id) {
      return rows.find((recipient) => recipient.id === id) ?? null;
    },
    async create(input) {
      const recipient = {
        id: recipientId,
        ...input,
        createdAt: now,
        updatedAt: now,
      };
      rows.push(recipient);
      return recipient;
    },
    async update(id, input) {
      const index = rows.findIndex((recipient) => recipient.id === id);
      if (index === -1) return null;

      rows[index] = { ...rows[index], ...input, updatedAt: now };
      return rows[index];
    },
  };
}

function recipientFixture(overrides = {}) {
  return {
    id: recipientId,
    name: 'Ayu',
    whatsappNumber: '628123456789',
    reportTitle: 'Daily GMV',
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test('recipient input is trimmed and defaults to active', () => {
  assert.deepEqual(
    parseCreateRecipient({
      name: '  Ayu  ',
      whatsappNumber: '628123456789',
      reportTitle: '  Daily GMV  ',
    }),
    {
      name: 'Ayu',
      whatsappNumber: '628123456789',
      reportTitle: 'Daily GMV',
      isActive: true,
    },
  );
});

test('invalid WhatsApp formats are rejected', () => {
  for (const whatsappNumber of [
    '+628123456789',
    '62 8123456789',
    '08123456789',
    '62abc123456',
    '6281234567890123',
  ]) {
    assert.throws(
      () =>
        parseCreateRecipient({
          name: 'Ayu',
          whatsappNumber,
          reportTitle: 'Daily GMV',
        }),
      RecipientValidationError,
    );
  }
});

test('unknown recipient fields are rejected', () => {
  assert.throws(
    () =>
      parseCreateRecipient({
        name: 'Ayu',
        whatsappNumber: '628123456789',
        reportTitle: 'Daily GMV',
        role: 'admin',
      }),
    RecipientValidationError,
  );
});

test('creates a recipient through the service repository', async () => {
  const service = createRecipientService(createTestRepository());
  const input = parseCreateRecipient({
    name: 'Ayu',
    whatsappNumber: '628123456789',
    reportTitle: 'Daily GMV',
  });

  const recipient = await service.createRecipient(input);

  assert.equal(recipient.id, recipientId);
  assert.equal(recipient.name, 'Ayu');
  assert.equal(recipient.isActive, true);
});

test('edits recipient fields', async () => {
  const service = createRecipientService(
    createTestRepository([recipientFixture()]),
  );
  const input = parseUpdateRecipient({
    name: 'Ayu Updated',
    reportTitle: 'Weekly GMV',
  });

  const recipient = await service.updateRecipient(recipientId, input);

  assert.equal(recipient.name, 'Ayu Updated');
  assert.equal(recipient.reportTitle, 'Weekly GMV');
  assert.equal(recipient.whatsappNumber, '628123456789');
});

test('deactivates and activates a recipient', async () => {
  const service = createRecipientService(
    createTestRepository([recipientFixture()]),
  );

  const inactive = await service.setRecipientActive(recipientId, false);
  assert.equal(inactive.isActive, false);

  const active = await service.setRecipientActive(recipientId, true);
  assert.equal(active.isActive, true);
});

test('reports a missing recipient without creating one', async () => {
  const service = createRecipientService(createTestRepository());

  await assert.rejects(
    () => service.getRecipientById(recipientId),
    RecipientNotFoundError,
  );
  await assert.rejects(
    () => service.updateRecipient(recipientId, { isActive: false }),
    RecipientNotFoundError,
  );
});
