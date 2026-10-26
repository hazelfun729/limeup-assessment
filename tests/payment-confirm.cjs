const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync('src/lib/payments/confirm.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const payment = { id: 'p_1', status: 'PENDING', assessmentId: 'a_1', userId: 'u_1' };
const handbook = { id: 'h_1', status: 'ANALYZING', contentHtml: null };
let calls = 0;
let failDispatch = false;
class ReportDispatchUncertainError extends Error {}
const tx = {
  payment: {
    updateMany: async () => { if (payment.status !== 'PENDING') return { count: 0 }; payment.status = 'CONFIRMED'; return { count: 1 }; },
    findUnique: async () => payment,
  },
  growthHandbook: { upsert: async () => handbook },
  admin: { findUnique: async () => ({ username: 'admin' }) },
  operationLog: { create: async () => {} },
};
const prisma = {
  $transaction: async callback => callback(tx),
  growthHandbook: { updateMany: async ({ data }) => { handbook.status = data.status; } },
};
const moduleMock = { exports: {} };
vm.runInNewContext(compiled, {
  module: moduleMock, exports: moduleMock.exports, Date, Error, console,
  require(id) {
    if (id === '@/lib/prisma') return { prisma };
    if (id === '@/lib/report/dispatch') return { ReportDispatchUncertainError, dispatchReportGeneration: async () => {
      calls++;
      if (failDispatch === 'uncertain') throw new ReportDispatchUncertainError('queue acceptance unknown');
      if (failDispatch) throw Error('queue unavailable');
      return { queued: true };
    } };
    throw Error(`Unexpected import ${id}`);
  },
});

(async () => {
  const confirm = moduleMock.exports.confirmAndStartReport;
  assert.equal((await confirm('p_1', 'admin', 'https://example.netlify.app')).reportStatus, 'ANALYZING');
  assert.equal(calls, 1);
  await confirm('p_1', 'admin', 'https://example.netlify.app');
  assert.equal(calls, 1);
  handbook.status = 'FAILED';
  await confirm('p_1', 'admin', 'https://example.netlify.app');
  assert.equal(calls, 2);
  handbook.status = 'FAILED';
  failDispatch = true;
  await assert.rejects(confirm('p_1', 'admin', 'https://example.netlify.app'), /付款已确认，但报告启动失败/);
  assert.equal(payment.status, 'CONFIRMED');
  assert.equal(handbook.status, 'FAILED');
  failDispatch = 'uncertain';
  const uncertain = await confirm('p_1', 'admin', 'https://example.netlify.app');
  assert.equal(uncertain.warning, 'queue acceptance unknown');
  assert.equal(handbook.status, 'ANALYZING', 'uncertain acceptance remains visible until job is resolved');
  console.log('PASS 付款确认自动启动、重复确认去重与失败可重试');
})().catch(error => { console.error(error); process.exitCode = 1; });
