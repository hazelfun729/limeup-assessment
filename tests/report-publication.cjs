const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadRoute(file, mocks) {
  const source = fs.readFileSync(file, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports, Request, Response, URL, console,
    require(id) {
      if (id === 'next/server') return { NextResponse: Response };
      if (id in mocks) return mocks[id];
      throw Error(`Unexpected import ${id}`);
    },
  });
  return module.exports.GET;
}

(async () => {
  let status = 'REVIEWING';
  let renders = 0;
  let admin = false;
  const handbook = () => ({
    id: 'hb_1', assessmentId: 'assessment_1', status,
    contentHtml: '<h2>未公开的报告</h2>', assessment: { growthProfile: {
      learningModeName: '小熊型', systemScores: { D: 60 },
      dimensionScores: { D1: 60 }, moduleScores: { M1: 60 },
    } },
  });
  const access = async () => null;
  const getJson = loadRoute('src/app/api/reports/[id]/route.ts', {
    '@/lib/prisma': { prisma: { growthHandbook: { findUnique: async () => handbook() } } },
    '@/lib/security/assessment': { assessmentAccess: access },
    '@/lib/security/report-html': { cleanReportHtml: html => html },
  });
  const getDocument = loadRoute('src/app/api/reports/[id]/document/route.ts', {
    '@/lib/security/assessment': { assessmentAccess: access },
    '@/lib/report/document': {
      loadReportDocument: async () => handbook(),
      renderReportDocument: async () => { renders++; return '<!doctype html><body>未公开的报告</body>'; },
    },
  });
  const getAdminDocument = loadRoute('src/app/api/admin/reports/[id]/document/route.ts', {
    '@/lib/admin/auth': { getAdminSession: async () => admin ? { id: 'admin_1' } : null },
    '@/lib/report/document': {
      loadReportDocument: async () => handbook(),
      renderReportDocument: async () => { renders++; return '<!doctype html><body>审核预览</body>'; },
    },
  });
  const context = { params: Promise.resolve({ id: 'hb_1' }) };
  const request = new Request('https://example.org/api/reports/hb_1/document');
  request.nextUrl = new URL(request.url);

  for (status of ['ANALYZING', 'REVIEWING', 'SENDING', 'FAILED']) {
    const json = await getJson(request, context);
    const document = await getDocument(request, context);
    assert.equal(json.status, 409, `${status} JSON should be closed`);
    assert.equal(document.status, 409, `${status} HTML should be closed`);
    assert.equal(renders, 0, `${status} must not render private HTML`);
  }
  status = 'REVIEWING';
  assert.equal((await getAdminDocument(request, context)).status, 401);
  admin = true;
  assert.equal((await getAdminDocument(request, context)).status, 200);
  assert.equal(renders, 1, 'administrator can preview before sending');
  status = 'SENT';
  const publicJson = await getJson(request, context);
  assert.equal(publicJson.status, 200);
  const published = await publicJson.json();
  assert.equal(published.profile.learningModeName, '小熊型');
  for (const field of ['systemScores', 'dimensionScores', 'moduleScores']) {
    assert.equal(field in published.profile, false, `public report must not expose ${field}`);
  }
  assert.equal((await getDocument(request, context)).status, 200);
  assert.equal(renders, 2);
  console.log('PASS 用户仅能阅读已发送报告，管理员可预览待审核报告');
})().catch(error => { console.error(error); process.exitCode = 1; });
