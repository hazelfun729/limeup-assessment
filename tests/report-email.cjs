const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('src/lib/report/document.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mockModule = { exports: {} };
let siteUrl = null;
vm.runInNewContext(compiled, {
  module: mockModule, exports: mockModule.exports, process,
  require(id) {
    if (id === 'node:fs/promises' || id === 'node:path') return require(id);
    if (id === '@/lib/prisma') return { prisma: {} };
    if (id === '@/lib/mail/delivery') return { publicSiteUrl: () => siteUrl };
    if (id === '@/lib/security/report-html') return { cleanReportHtml: (html) => html };
    if (id === './structure') return { splitChapters: (html) => [{ number: 1, title: '第一章 全景学习画像', html }] };
    throw new Error(`Unexpected import ${id}`);
  },
  Date, String, Object,
});
const handbook = {
  id: 'hb_1', createdAt: new Date('2026-09-30'), contentHtml: '<h3>具体建议</h3><p>报告完整内容</p>',
  content: { reportSchema: 'lime-v4', snapshot: { studentName: '小明', animal: '绵羊型', assessmentDate: '2026-09-30' } },
  assessment: { studentName: '小明', startedAt: new Date('2026-09-30'), growthProfile: null },
};
mockModule.exports.renderReportEmail(handbook).then(async (html) => {
  assert.match(html, /报告完整内容/);
  assert.match(html, /成长导航报告/);
  assert.doesNotMatch(html, /window\.print|下载 HTML|localhost|127\.0\.0\.1|<div class="toolbar"/);
  assert.doesNotMatch(html, /data:image\/png/);
  assert.doesNotMatch(html, /<style>|@media print|display:grid|break-before/);
  assert.match(html, /src="cid:limeup-report-logo"/);
  assert.match(html, /<table role="presentation"/);
  assert.match(html, /href="#chapter-1"/);
  assert.match(html, /id="chapter-1"/);
  assert.match(html, /<p style="margin:0 0 16px/);
  assert.doesNotMatch(html, /查看正式报告/);
  const preview = await mockModule.exports.renderReportEmail(handbook, true);
  assert.match(preview, /查看正式报告/);
  assert.match(preview, /href="\/report\/hb_1"/);
  siteUrl = 'https://reports.example.org';
  const published = await mockModule.exports.renderReportEmail(handbook);
  assert.match(published, /https:\/\/reports\.example\.org\/login\?redirect=%2Freport%2Fhb_1/);
  assert.doesNotMatch(published, /127\.0\.0\.1/);
  console.log('PASS 邮件包含完整报告、CID logo 和邮件兼容布局，无网页打印样式');
}).catch((error) => { console.error(error); process.exitCode = 1; });
