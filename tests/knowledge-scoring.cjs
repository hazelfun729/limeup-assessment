const fs=require('fs'),path=require('path'),ts=require('typescript'),vm=require('vm'),assert=require('node:assert/strict');
const root=process.cwd(),payload=JSON.parse(fs.readFileSync('docs/reference/knowledge-import.json'));
const configs=new Map(Object.entries(payload.entries).map(([k,v])=>['knowledge:'+payload.version+':'+k,JSON.stringify(v)]));configs.set('knowledge:active',payload.version);
const prisma={siteConfig:{findUnique:async({where})=>configs.has(where.key)?{value:configs.get(where.key)}:null,findMany:async({where})=>where.key.in.filter(k=>configs.has(k)).map(k=>({key:k,value:configs.get(k)}))}};
const cache={};function load(p){p=path.resolve(root,p);if(cache[p])return cache[p].exports;const m={exports:{}};cache[p]=m;const source=ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021}}).outputText;vm.runInThisContext('(function(require,module,exports){'+source+'\n})',{filename:p})(name=>name==='@/lib/prisma'?{prisma}:name.startsWith('@/')?load('src/'+name.slice(2)+'.ts'):name.startsWith('.')?load(path.resolve(path.dirname(p),name)+'.ts'):require(name),m,m.exports);return m.exports;}
const engine=load('src/lib/scoring/engine.ts');const knowledge=load('src/lib/knowledge/reference.ts');
let count=0;function check(name,fn){fn();count++;console.log('PASS',name)}
(async()=>{
for(const rule of payload.entries.scoring.questions)check('最终表题目 '+rule.order,()=>{for(const [answer,score] of Object.entries(rule.scores))assert.equal(engine.calculateAnswerScore(answer,rule.reverse),score)});
const records=payload.entries.scoring.questions.map(q=>({questionOrder:q.order,answer:'ALWAYS',score:100}));
const unknown=records.map(q=>q.questionOrder===1?{...q,answer:'UNKNOWN',score:0}:q);
check('不了解不拉低同模块平均',()=>assert.equal(engine.calculateScores(unknown).moduleScores.M_AUTONOMY,100));
const missing=records.map(q=>[1,2].includes(q.questionOrder)?{...q,answer:'UNKNOWN',score:0}:q);
check('整模块缺少观察不填零',()=>assert.equal(engine.calculateScores(missing).moduleScores.M_AUTONOMY,undefined));
check('缺失模块不拉低系统平均',()=>assert.equal(engine.calculateScores(missing).systemScores.D.score,100));
check('全不了解不伪造低分分类',()=>assert.throws(()=>engine.calculateScores(records.map(q=>({...q,answer:'UNKNOWN'}))),/缺少有效回答/));
check('真实零分仍参与平均',()=>assert.equal(engine.calculateScores(records.map(q=>q.questionOrder===1?{...q,score:0}:q)).moduleScores.M_AUTONOMY,50));
for(const key of Object.keys(payload.entries).filter(k=>k.startsWith('type:'))){const combo=key.slice(5),values=combo.split('_').map(x=>x==='强'?90:x==='中'?60:20);const result=await knowledge.loadReportReference({motivation:{score:values[0]},ability:{score:values[1]},perseverance:{score:values[2]}});check('资料匹配 '+combo,()=>assert.equal(JSON.parse(result.text).interpretation.combination,combo));}
const policy=load('src/lib/report/v4-prompt.ts');
check('黄牛组合使用通用报告模板',()=>assert.equal(policy.reportBranch('强_中_中'),policy.REPORT_PROMPTS.general));
check('三项强组合使用1型专用模板',()=>assert.equal(policy.reportBranch('强_强_强'),policy.REPORT_PROMPTS.type1));
configs.delete('knowledge:active');await assert.rejects(()=>knowledge.loadReportReference({D:90,A:90,P:90}),/尚未导入/);count++;
console.log('TOTAL PASSED',count);
})().catch(e=>{console.error(e);process.exitCode=1});
