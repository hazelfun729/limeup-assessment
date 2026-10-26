const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { createHmac } = require('node:crypto');

const source = fs.readFileSync('src/lib/report/dispatch.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const state = { env: {}, calls: [], generated: 0, reserved: 0, rejected: 0, busy: false,
  handbook: { id: 'hb_1', version: 2, contentHtml: null, status: 'ANALYZING' } };
const moduleMock = { exports: {} };
vm.runInNewContext(compiled, {
  module: moduleMock, exports: moduleMock.exports, process: { env: state.env }, URL, AbortSignal,
  require(id) {
    if (id === 'node:crypto') return require(id);
    if (id === '@/lib/prisma') return { prisma: { growthHandbook: { findUnique: async () => state.handbook } } };
    if (id === './generator') return { generateHandbook: async () => { state.generated++; return { handbookId: 'hb_1' }; } };
    if (id === './job') return {
      reserveReportJob: async () => { state.reserved++; return state.busy ? null : { id: `job_${state.reserved}`, expectedVersion: 2 }; },
      rejectReportJob: async () => { state.rejected++; },
    };
    throw Error(`Unexpected import ${id}`);
  },
  fetch: async (url, options) => { state.calls.push({ url: String(url), options }); return { status: 202 }; },
  Error,
});

(async () => {
  const dispatch = moduleMock.exports.dispatchReportGeneration;
  const local = await dispatch('a_1', 'http://localhost:3001');
  assert.equal(local.outcome, 'GENERATED');
  assert.equal(state.generated, 1);
  state.env.SITE_ID = 'netlify-site';
  state.env.URL = 'https://example.netlify.app';
  state.env.SITE_NAME = 'example';
  state.env.REPORT_JOB_SECRET = 'test-secret';
  const remote = await dispatch('a_2', 'https://example.netlify.app/api/admin');
  assert.equal(remote.outcome, 'QUEUED');
  assert.equal(state.generated, 1);
  assert.equal(state.calls[0].url, 'https://example.netlify.app/.netlify/functions/generate-report');
  assert.equal(state.calls[0].options.headers['X-Report-Signature'], createHmac('sha256', 'test-secret').update(state.calls[0].options.body).digest('hex'));
  assert.equal(JSON.parse(state.calls[0].options.body).jobId, 'job_1');
  await dispatch('a_2', 'https://example.netlify.app', true);
  assert.equal(JSON.parse(state.calls[1].options.body).expectedVersion, 2);
  state.busy = true;
  assert.equal((await dispatch('a_2', 'https://example.netlify.app')).outcome, 'ALREADY_QUEUED');
  assert.equal(state.calls.length, 2, 'duplicate request must not dispatch');
  state.busy = false;
  state.handbook.contentHtml = '<p>报告</p>';
  assert.equal((await dispatch('a_2', 'https://example.netlify.app')).outcome, 'SKIPPED');
  assert.equal(state.calls.length, 2, 'existing content must not dispatch');
  state.handbook.contentHtml = null;
  await assert.rejects(dispatch('a_2', 'https://other.example.org'), /站点地址/);
  delete state.env.REPORT_JOB_SECRET;
  await assert.rejects(dispatch('a_3', 'https://example.netlify.app'), /REPORT_JOB_SECRET/);
  console.log('PASS 本地生成、任务签名、重复排队和已有内容跳过');
})().catch(error => { console.error(error); process.exitCode = 1; });
