const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { createHmac } = require('node:crypto');

const source = fs.readFileSync('netlify/functions/generate-report.mts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const env = { REPORT_JOB_SECRET: 'test-secret' };
let generated = 0, claimed = 0, completed = 0, failed = 0, claimable = true;
let handbook = { status: 'ANALYZING', contentHtml: null, version: 1 };
const moduleMock = { exports: {} };
vm.runInNewContext(compiled, {
  module: moduleMock, exports: moduleMock.exports, process: { env }, Buffer, Request, Response, console,
  require(id) {
    if (id === 'node:crypto') return require(id);
    if (id === '../../src/lib/prisma') return { prisma: {
      growthHandbook: { findUnique: async () => handbook, updateMany: async () => ({ count: 1 }) },
    } };
    if (id === '../../src/lib/report/generator') return { generateHandbook: async () => { generated++; } };
    if (id === '../../src/lib/report/pipeline') return { ReportBusyError: class ReportBusyError extends Error {} };
    if (id === '../../src/lib/report/job') return {
      claimReportJob: async () => { claimed++; return claimable; },
      completeReportJob: async () => { completed++; return true; },
      failReportJob: async () => { failed++; return true; },
    };
    throw Error(`Unexpected import ${id}`);
  },
  Error, JSON,
});

(async () => {
  const handler = moduleMock.exports.default;
  assert.equal(moduleMock.exports.config.background, true);
  const body = JSON.stringify({ assessmentId: 'a_1', regenerate: false, expectedVersion: null, jobId: 'j_1' });
  const request = (signature, data = body) => new Request('https://example.netlify.app/.netlify/functions/generate-report', {
    method: 'POST', headers: { 'X-Report-Signature': signature }, body: data,
  });
  assert.equal((await handler(request('bad'))).status, 401);
  assert.equal(claimed, 0);
  const signature = createHmac('sha256', env.REPORT_JOB_SECRET).update(body).digest('hex');
  assert.equal((await handler(request(signature))).status, 200);
  assert.equal(generated, 1);
  assert.equal(completed, 1);
  claimable = false;
  await handler(request(signature));
  assert.equal(generated, 1, 'duplicate delivery must not generate again');
  claimable = true;
  handbook = { status: 'REVIEWING', contentHtml: '<p>报告</p>', version: 2 };
  await handler(request(signature));
  assert.equal(generated, 1, 'existing report must not generate again');
  const redo = JSON.stringify({ assessmentId: 'a_1', regenerate: true, expectedVersion: 2, jobId: 'j_2' });
  const redoSignature = createHmac('sha256', env.REPORT_JOB_SECRET).update(redo).digest('hex');
  await handler(request(redoSignature, redo));
  assert.equal(generated, 2);
  handbook.version = 3;
  await handler(request(redoSignature, redo));
  assert.equal(generated, 2, 'outdated regeneration must not generate');
  assert.equal(failed, 0);
  console.log('PASS 后台任务签名、持久认领、去重和版本校验');
})().catch(error => { console.error(error); process.exitCode = 1; });
