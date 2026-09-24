import assert from 'node:assert/strict';
import test from 'node:test';

import { AuthenticationRequiredError } from '../server/auth/session-policy.ts';
import {
  ReportCycleConflictError,
  ReportCycleUnavailableError,
} from '../server/report-cycles/errors.ts';
import { classifyReportCycleError } from '../server/report-cycles/http.ts';
import { createReportCycleService } from '../server/report-cycles/service.ts';

const adminUserId = 'admin-user';
const firstCycleId = '11111111-1111-4111-8111-111111111111';
const secondCycleId = '22222222-2222-4222-8222-222222222222';
const now = new Date('2026-09-11T04:00:00.000Z');

function cycleFixture(overrides = {}) {
  return {
    id: firstCycleId,
    cycleNumber: 1,
    startedAt: new Date('2026-09-01T00:00:00.000Z'),
    endedAt: null,
    isActive: true,
    createdBy: adminUserId,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createTestRepository(initialCycles = []) {
  const state = {
    cycles: initialCycles.map((cycle) => ({ ...cycle })),
    resetLogs: [],
    reports: [{ id: 'existing-report', cycleId: firstCycleId }],
  };
  let resetInProgress = false;

  const repository = {
    async getOrCreateActive({ adminUserId: creator, now: startedAt }) {
      const active = state.cycles.find((cycle) => cycle.isActive);
      if (active) return active;
      if (state.cycles.length > 0) throw new ReportCycleUnavailableError();

      const firstCycle = {
        id: firstCycleId,
        cycleNumber: 1,
        startedAt,
        endedAt: null,
        isActive: true,
        createdBy: creator,
        createdAt: startedAt,
      };
      state.cycles.push(firstCycle);
      return firstCycle;
    },

    async reset({ adminUserId: performer, expectedCycleId, now: resetAt }) {
      if (resetInProgress) throw new ReportCycleConflictError();
      resetInProgress = true;

      try {
        await new Promise((resolve) => setImmediate(resolve));
        const active = state.cycles.find((cycle) => cycle.isActive);
        if (!active) throw new ReportCycleUnavailableError();
        if (active.id !== expectedCycleId) {
          throw new ReportCycleConflictError();
        }

        active.isActive = false;
        active.endedAt = resetAt;
        const newCycle = {
          id: secondCycleId,
          cycleNumber: active.cycleNumber + 1,
          startedAt: resetAt,
          endedAt: null,
          isActive: true,
          createdBy: performer,
          createdAt: resetAt,
        };
        state.cycles.push(newCycle);
        state.resetLogs.push({
          previousCycleId: active.id,
          newCycleId: newCycle.id,
          performedBy: performer,
          resetAt,
        });
        return newCycle;
      } finally {
        resetInProgress = false;
      }
    },
  };

  return { repository, state };
}

test('initializes the first global cycle safely', async () => {
  const { repository, state } = createTestRepository();
  const service = createReportCycleService(repository, () => now);

  const cycle = await service.getActiveReportCycle(adminUserId);

  assert.equal(cycle.cycleNumber, 1);
  assert.equal(cycle.isActive, true);
  assert.equal(cycle.startedAt, now);
  assert.equal(cycle.createdBy, adminUserId);
  assert.equal(state.cycles.length, 1);
});

test('reuses an existing active cycle', async () => {
  const existing = cycleFixture();
  const { repository, state } = createTestRepository([existing]);
  const service = createReportCycleService(repository, () => now);

  const cycle = await service.getActiveReportCycle(adminUserId);

  assert.equal(cycle.id, existing.id);
  assert.equal(state.cycles.length, 1);
});

test('initialization leaves only one active cycle', async () => {
  const { repository, state } = createTestRepository();
  const service = createReportCycleService(repository, () => now);

  const [first, second] = await Promise.all([
    service.getActiveReportCycle(adminUserId),
    service.getActiveReportCycle(adminUserId),
  ]);

  assert.equal(first.id, second.id);
  assert.equal(state.cycles.filter((cycle) => cycle.isActive).length, 1);
});

test('manual reset archives old cycle and increments the cycle number', async () => {
  const { repository, state } = createTestRepository([cycleFixture()]);
  const service = createReportCycleService(repository, () => now);

  const newCycle = await service.resetReportCycle(adminUserId, firstCycleId);

  assert.equal(state.cycles[0].isActive, false);
  assert.equal(state.cycles[0].endedAt, now);
  assert.equal(newCycle.cycleNumber, 2);
  assert.equal(newCycle.isActive, true);
  assert.equal(state.cycles.filter((cycle) => cycle.isActive).length, 1);
});

test('manual reset creates an integrity audit log', async () => {
  const { repository, state } = createTestRepository([cycleFixture()]);
  const service = createReportCycleService(repository, () => now);

  await service.resetReportCycle(adminUserId, firstCycleId);

  assert.deepEqual(state.resetLogs, [
    {
      previousCycleId: firstCycleId,
      newCycleId: secondCycleId,
      performedBy: adminUserId,
      resetAt: now,
    },
  ]);
});

test('reset never deletes existing reports', async () => {
  const { repository, state } = createTestRepository([cycleFixture()]);
  const service = createReportCycleService(repository, () => now);
  const reportsBeforeReset = structuredClone(state.reports);

  await service.resetReportCycle(adminUserId, firstCycleId);

  assert.deepEqual(state.reports, reportsBeforeReset);
});

test('unauthenticated cycle API access maps to HTTP 401', () => {
  const response = classifyReportCycleError(new AuthenticationRequiredError());

  assert.equal(response.status, 401);
  assert.equal(response.code, 'AUTHENTICATION_REQUIRED');
});

test('concurrent reset rejects the losing request safely', async () => {
  const { repository, state } = createTestRepository([cycleFixture()]);
  const service = createReportCycleService(repository, () => now);

  const results = await Promise.allSettled([
    service.resetReportCycle(adminUserId, firstCycleId),
    service.resetReportCycle(adminUserId, firstCycleId),
  ]);
  const fulfilled = results.filter((result) => result.status === 'fulfilled');
  const rejected = results.filter((result) => result.status === 'rejected');

  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.ok(rejected[0].reason instanceof ReportCycleConflictError);
  assert.equal(state.cycles.filter((cycle) => cycle.isActive).length, 1);
  assert.equal(state.resetLogs.length, 1);
});

test('stale expected cycle ID is rejected', async () => {
  const { repository } = createTestRepository([cycleFixture()]);
  const service = createReportCycleService(repository, () => now);

  await assert.rejects(
    () => service.resetReportCycle(adminUserId, secondCycleId),
    ReportCycleConflictError,
  );
});
