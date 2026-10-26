const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync('src/lib/mail/transport.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
const env = {};
let accepted = [];
let smtpCalls = 0;
let resendCalls = 0;
const moduleMock = { exports: {} };
vm.runInNewContext(compiled, {
  module: moduleMock, exports: moduleMock.exports, process: { env }, Buffer,
  require(id) {
    if (id === 'nodemailer') return { createTransport: () => ({ sendMail: async () => { smtpCalls++; return { accepted }; } }) };
    if (id === 'resend') return { Resend: class { emails = { send: async () => { resendCalls++; return { error: null }; } }; } };
    throw Error(`Unexpected import ${id}`);
  },
  Error, Number, Boolean,
});

(async () => {
  const { sendMailMessage, mailConfigured } = moduleMock.exports;
  const mail = { to: 'parent@example.org', subject: 'test', html: '<p>test</p>' };
  assert.equal(mailConfigured(), false);
  env.RESEND_API_KEY = 'test';
  assert.equal(mailConfigured(), true);
  await sendMailMessage(mail);
  assert.equal(resendCalls, 1);
  env.SMTP_HOST = 'smtp.example.org';
  env.SMTP_USER = 'sender@example.org';
  await assert.rejects(sendMailMessage(mail), /未接受收件地址/);
  accepted = [mail.to];
  await sendMailMessage(mail);
  assert.equal(smtpCalls, 2);
  assert.equal(resendCalls, 1);
  console.log('PASS SMTP 优先、拒收不记成功、Resend 回退');
})().catch(error => { console.error(error); process.exitCode = 1; });
