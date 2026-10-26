const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync('src/lib/assessment/bind.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleMock = { exports: {} };
vm.runInNewContext(compiled, { module: moduleMock, exports: moduleMock.exports, Date, Error });
const bind = moduleMock.exports.bindCompletedAssessment;

(async () => {
  let owner = null;
  let status = 'IN_PROGRESS';
  let contactCount = 0;
  const tx = {
    assessment: {
      updateMany: async ({ where }) => {
        if (status !== where.status || (owner && owner !== where.OR[1].userId)) return { count: 0 };
        owner = where.OR[1].userId; status = 'COMPLETED'; return { count: 1 };
      },
      findUnique: async () => ({ userId: owner, status }),
    },
    cRMContact: { upsert: async () => { contactCount++; } },
  };
  await bind(tx, 'assessment', 'parent_a');
  await bind(tx, 'assessment', 'parent_a');
  assert.equal(contactCount, 2);
  await assert.rejects(bind(tx, 'assessment', 'parent_b'), /其他账号/);
  assert.equal(owner, 'parent_a');
  assert.equal(contactCount, 2);
  console.log('PASS 测评绑定允许本人重复提交，拒绝其他账号接管');
})().catch(error => { console.error(error); process.exitCode = 1; });
