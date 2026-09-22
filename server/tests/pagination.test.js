import { jest } from '@jest/globals';
import { paginationQuerySchema, toSkipLimit } from '../src/utils/paginate.js';
import { sendPaginated } from '../src/utils/ApiResponse.js';
import { connectTestDb, clearTestDb, disconnectTestDb } from './setup/testDb.js';
import { makeOrg, makeEvent } from './helpers/factories.js';
import { listEvents } from '../src/services/event.service.js';

describe('paginationQuerySchema', () => {
  it('defaults page to 1 and limit to 20 when omitted', () => {
    const result = paginationQuerySchema.parse({});
    expect(result).toEqual({ page: 1, limit: 20 });
  });

  it('caps limit at 100 even if a larger value is requested', () => {
    expect(() => paginationQuerySchema.parse({ limit: 500 })).toThrow();
  });

  it('coerces string query values to numbers', () => {
    const result = paginationQuerySchema.parse({ page: '3', limit: '10' });
    expect(result).toEqual({ page: 3, limit: 10 });
  });
});

describe('toSkipLimit', () => {
  it('computes the correct skip for a given page/limit', () => {
    expect(toSkipLimit({ page: 1, limit: 20 })).toEqual({ skip: 0, limit: 20 });
    expect(toSkipLimit({ page: 3, limit: 10 })).toEqual({ skip: 20, limit: 10 });
  });
});

describe('sendPaginated', () => {
  function fakeRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  it('never reports totalPages as 0, even when total is 0', () => {
    const res = fakeRes();
    sendPaginated(res, { data: [], page: 1, limit: 20, total: 0 });
    const body = res.json.mock.calls[0][0];
    expect(body.pagination.totalPages).toBe(1);
  });

  it('computes totalPages correctly for a non-zero total', () => {
    const res = fakeRes();
    sendPaginated(res, { data: [], page: 1, limit: 20, total: 45 });
    const body = res.json.mock.calls[0][0];
    expect(body.pagination.totalPages).toBe(3);
  });
});

describe('listEvents pagination + filtering (live-route-adjacent smoke test)', () => {
  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  it('paginates and filters by category together', async () => {
    const { organization, owner } = await makeOrg();
    await makeEvent({ organization, createdBy: owner, overrides: { category: 'Conference' } });
    await makeEvent({ organization, createdBy: owner, overrides: { category: 'Conference' } });
    await makeEvent({ organization, createdBy: owner, overrides: { category: 'Workshop' } });

    const page1 = await listEvents(organization._id, { page: 1, limit: 1, category: 'Conference' });
    expect(page1.total).toBe(2); // total reflects the filter, not the page size
    expect(page1.data).toHaveLength(1);

    const page2 = await listEvents(organization._id, { page: 2, limit: 1, category: 'Conference' });
    expect(page2.data).toHaveLength(1);
    expect(page2.data[0]._id).not.toBe(page1.data[0]._id);
  });
});
