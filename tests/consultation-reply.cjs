const fs=require('fs'),ts=require('typescript'),vm=require('vm'),assert=require('node:assert/strict');
let admin=null,letter,delivery,result,updates=0;
const prisma={consultationLetter:{findUnique:async()=>letter,update:async({data})=>{Object.assign(letter,data);updates++;return letter;}},delivery:{findUnique:async()=>delivery,upsert:async({create,update})=>{delivery=delivery?{...delivery,...update}:create;return delivery;}},$queryRaw:async()=>[],$transaction:async f=>f(prisma)};
const m={exports:{}};const js=ts.transpileModule(fs.readFileSync('src/app/api/admin/consultations/[id]/reply/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021}}).outputText;
vm.runInThisContext('(function(require,module,exports){'+js+'\n})')(n=>n==='@/lib/admin/auth'?{getAdminSession:async()=>admin}:n==='@/lib/prisma'?{prisma}:n==='@/lib/mail/delivery'?{escapeHtml:s=>s.replace(/</g,'&lt;'),deliver:async()=>result}:require(n),m,m.exports);
let count=0;function check(n,c){assert.ok(c,n);count++;}
const call=body=>m.exports.POST(new Request('http://localhost/api/admin/consultations/l/reply',{method:'POST',body:JSON.stringify(body)}),{params:Promise.resolve({id:'l'})});
(async()=>{
check('anonymous forbidden',(await call({reply:'hello'})).status===401);admin={id:'admin'};
check('empty invalid',(await call({reply:' '})).status===400);check('oversize invalid',(await call({reply:'a'.repeat(20001)})).status===400);
check('missing letter',(await call({reply:'hello'})).status===404);
letter={id:'l',userId:'u',email:'test@example.invalid',status:'PENDING'};result={status:'FAILED',error:'failed'};
check('failure reported',(await call({reply:'<script>test</script>'})).status===409);check('failed is not replied',letter.status==='FAILED'&&!letter.sentAt);check('reply retained',letter.reply==='<script>test</script>');check('HTML escaped',!delivery.html.includes('<script>'));
delivery.status='FAILED';result={status:'SENT',sentAt:new Date()};check('retry succeeds',(await call({reply:'修改后的回复'})).status===200);check('sent marked replied',letter.status==='REPLIED'&&letter.sentAt===result.sentAt);
delivery.status='SENT';const before=letter.reply;await call({reply:'不应覆盖'});check('sent content immutable',letter.reply===before);
delivery.status='UNKNOWN';result={status:'UNKNOWN'};check('unknown response not success',(await call({reply:'不应覆盖'})).status===409);check('unknown no overwrite',letter.reply===before);
console.log('PASS',count,'consultation reply checks (mocked transport)');fs.writeFileSync('docs/consultation-reply-test-results.json',JSON.stringify({passed:count,realEmail:false,testedAt:new Date().toISOString()},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
