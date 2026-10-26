const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync('src/lib/mail/delivery.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
const row = { id: 'test-report', kind: 'HANDBOOK', status: 'PENDING', html: '<img src="cid:limeup-report-logo">', to: 'test@example.org', subject: '报告', attempts: 0 };
let sent;
const prisma = { delivery: {
  updateMany: async ({ data }) => { row.status = data.status; row.attempts++; return { count: 1 }; },
  findUniqueOrThrow: async () => ({ ...row }),
  update: async ({ data }) => { Object.assign(row, data); return { ...row }; },
} };
const moduleMock = { exports: {} };
vm.runInNewContext(compiled, {
  module: moduleMock, exports: moduleMock.exports, process,
  require(id) {
    if (id === 'node:fs/promises' || id === 'node:path') return require(id);
    if (id === '@/lib/prisma') return { prisma };
    if (id === './transport') return { sendMailMessage: async (message) => { sent = message; } };
    throw Error(`Unexpected import ${id}`);
  },
  Date, Error, Number, String, Object,
});
const oldHost = process.env.SMTP_HOST;
process.env.SMTP_HOST = 'test.invalid';
moduleMock.exports.deliver(row.id).then((result) => {
  assert.equal(result.status, 'SENT');
  assert.equal(sent.inlineLogo.cid, 'limeup-report-logo');
  assert.ok(sent.inlineLogo.content.length > 1000);
  assert.match(sent.html, /cid:limeup-report-logo/);
  console.log('PASS 报告邮件通过 CID 内嵌品牌图片，无真实投递');
}).catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => {
  if (oldHost === undefined) delete process.env.SMTP_HOST;
  else process.env.SMTP_HOST = oldHost;
});
