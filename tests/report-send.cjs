const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync('src/lib/report/send.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const handbook = {
  id: 'hb_1', version: 2, status: 'REVIEWING', contentHtml: '<h2>第一章</h2><p>报告内容</p>',
  userId: 'user_1', user: { id: 'user_1', email: 'parent@example.org', emailVerified: true },
  assessment: { studentName: '小明', payment: { status: 'CONFIRMED' }, growthProfile: null },
};
let current;
let delivery;
let delivered;
let emailRecord;
let providerCalls;
const prisma = {
  growthHandbook: {
    findUnique: async () => current && structuredClone(current),
    findUniqueOrThrow: async () => ({ version: current.version, status: current.status }),
    updateMany: async ({ data }) => { current = { ...current, ...data }; return { count: 1 }; },
    update: async ({ data }) => { current = { ...current, ...data }; return current; },
  },
  delivery: {
    findUnique: async () => delivery,
    create: async ({ data }) => { delivery = { ...data, status: 'PENDING', attempts: 0, error: null, sentAt: null }; return delivery; },
  },
  email: { upsert: async ({ create, update }) => { emailRecord = emailRecord ? { ...emailRecord, ...update } : create; } },
};
const mockModule = { exports: {} };
vm.runInNewContext(compiled, {
  module: mockModule, exports: mockModule.exports,
  require(id) {
    if (id === '@/lib/prisma') return { prisma };
    if (id === '@/lib/mail/delivery') return { deliver: async () => {
      providerCalls++;
      delivery = { ...delivery, status: delivered ? 'SENT' : 'FAILED', sentAt: delivered ? new Date() : null, error: delivered ? null : '邮件服务器拒绝' };
      return delivery;
    } };
    if (id === '@/lib/report/document') return { renderReportEmail: async () => '<html><body>完整报告</body></html>' };
    throw new Error(`Unexpected import ${id}`);
  },
  Date, Error, Set, String, Object, Math,
});
const { sendReviewedReport, isDeliverableReportAddress } = mockModule.exports;
async function reset() {
  current = structuredClone(handbook); delivery = null; emailRecord = null; providerCalls = 0; delivered = true;
}
(async () => {
  assert.equal(isDeliverableReportAddress('student@historical.limeup.local'), false);
  assert.equal(isDeliverableReportAddress('parent@example.org'), true);
  await reset();
  current.user.email = 'student@historical.limeup.local';
  await assert.rejects(sendReviewedReport('hb_1', 'admin_1'), /占位或无效邮箱/);
  assert.equal(providerCalls, 0);
  assert.equal(current.status, 'REVIEWING');

  await reset();
  delivered = false;
  const failed = await sendReviewedReport('hb_1', 'admin_1');
  assert.equal(failed.status, 'FAILED');
  assert.equal(current.status, 'SENDING');
  assert.equal(emailRecord.status, 'FAILED');
  delivered = true;
  const sent = await sendReviewedReport('hb_1', 'admin_1');
  assert.equal(sent.status, 'SENT');
  assert.equal(current.status, 'SENT');
  assert.equal(providerCalls, 2);
  await sendReviewedReport('hb_1', 'admin_1');
  assert.equal(providerCalls, 2, 'a repeat click must not resend the report');
  console.log('PASS 占位邮箱拦截、失败保留、重试、已发送去重');
})().catch((e) => { console.error(e); process.exitCode = 1; });
