const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync('src/lib/report/job.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const rows = new Map();
const siteConfig = {
  findUnique: async ({ where: { key } }) => rows.has(key) ? { key, value: rows.get(key) } : null,
  upsert: async ({ where: { key }, create, update }) => { rows.set(key, rows.has(key) ? update.value : create.value); },
  updateMany: async ({ where: { key, value }, data }) => {
    if (rows.get(key) !== value) return { count: 0 };
    rows.set(key, data.value);
    return { count: 1 };
  },
};
const prisma = { siteConfig, $transaction: async fn => fn({ siteConfig, $queryRaw: async () => [{ acquired: true }] }) };
const moduleMock = { exports: {} };
vm.runInNewContext(compiled, {
  module: moduleMock, exports: moduleMock.exports, Date, JSON, Number,
  require(id) {
    if (id === 'node:crypto') return require(id);
    if (id === '@/lib/prisma') return { prisma };
    throw Error(`Unexpected import ${id}`);
  },
});

(async () => {
  const { reserveReportJob, claimReportJob, completeReportJob, failReportJob,
    getReportJob, isStaleReportJob } = moduleMock.exports;
  const first = await reserveReportJob('a_1', false, null);
  assert.equal(first.state, 'QUEUED');
  assert.equal(await reserveReportJob('a_1', false, null), null, 'second paid request must not reserve again');
  assert.equal(await claimReportJob('a_1', first.id), true);
  assert.equal(await claimReportJob('a_1', first.id), false, 'worker can claim once');
  assert.equal(await completeReportJob('a_1', first.id), true);
  assert.equal((await getReportJob('a_1')).state, 'SUCCEEDED');
  assert.equal(await failReportJob('a_1', first.id, 'late failure'), false, 'late failure must not overwrite success');
  const second = await reserveReportJob('a_1', true, 2);
  assert.notEqual(second.id, first.id);
  assert.equal(await claimReportJob('a_1', first.id), false, 'old delivery cannot claim replacement');
  const key = 'report:job:a_1';
  rows.set(key, JSON.stringify({ ...second, requestedAt: new Date(Date.now() - 21 * 60_000).toISOString() }));
  assert.equal(isStaleReportJob(await getReportJob('a_1')), true);
  assert.ok(await reserveReportJob('a_1', true, 2), 'stale job can be manually retried');
  console.log('PASS 持久任务认领、去重、完成与超时后人工重试');
})().catch(error => { console.error(error); process.exitCode = 1; });
