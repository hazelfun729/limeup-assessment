const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const ts=require(process.env.TYPESCRIPT_PATH||'typescript');
const cache={};let assessment;
const prisma={assessment:{findUnique:async()=>assessment},prompt:{findMany:async()=>[
 {id:'system',name:'成长导航 V4 · 共用写作',content:'共用原文',version:4},
 {id:'branch',name:'成长导航 V4 · 2—27型',content:'分支原文',version:4},
]}};
function load(file){file=path.resolve(file);if(cache[file])return cache[file].exports;const m={exports:{}};cache[file]=m;
 const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021}}).outputText;
 const req=name=>name==='@/lib/prisma'?{prisma}:name==='@/lib/knowledge/reference'?{numericScores:x=>x,loadReportReference:async()=>({version:'known',combination:'中_中_中',text:JSON.stringify({taxonomy:{},interpretation:{number:14,bottleneck:'动力',strategies:['环境重塑']}})})}:name==='@/lib/security/report-html'?{cleanReportHtml:x=>x}:name==='marked'?{marked:{}}:name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):require(name);
 vm.runInThisContext('(function(require,module,exports){'+source+'\n})',{filename:file})(req,m,m.exports);return m.exports;}
const structure=load('src/lib/report/structure.ts'),policy=load('src/lib/report/v4-prompt.ts'),pipeline=load('src/lib/report/pipeline.ts');
const html=['一','二','三','四','五','六'].map(n=>`<h2>第${n}章 章节</h2><h3>细节标题</h3><p>解释内容</p><table><tr><td>行动计划</td></tr></table><hr>`).join('');
const chapters=structure.splitChapters(html);assert.equal(chapters.length,6);assert.ok(chapters[0].html.includes('<h3>细节标题'));assert.ok(chapters[4].html.includes('<table>'));assert.ok(!chapters[3].html.includes('<hr>'));
assert.equal(policy.reportBranch('强_强_强'),policy.REPORT_PROMPTS.type1);assert.equal(policy.reportBranch('中_中_中'),policy.REPORT_PROMPTS.general);
assert.equal(policy.ANSWER_LABELS.SOMETIMES,'比较不符合');
function answer(order,answer,score){return {questionId:'q'+order,answer,score,question:{id:'q'+order,versionId:'v1',order,content:'完整题干 '+order,scoreValues:{SOMETIMES:90,UNKNOWN:0},module:{name:'模块',dimension:{name:'维度',system:{name:'系统'}}}}};}
assessment={id:'hist_017',status:'COMPLETED',userId:'u',user:{emailVerified:true},payment:{status:'CONFIRMED'},growthProfile:{systemScores:{D:56,A:71,P:63},dimensionScores:{},moduleScores:{},learningModeName:'绵羊型'},source:'historical_import',questionVersionId:'v1',questionVersion:{version:1,description:'历史',questions:[{id:'q27'},{id:'q62'}]},answerRecords:[answer(27,'UNKNOWN',70),answer(62,'SOMETIMES',90)],studentName:'白龙',grade:'6',completedAt:new Date('2025-12-26'),phone:'PRIVATE_PHONE',ip:'PRIVATE_IP'};
(async()=>{
 const ctx=await pipeline.prepareReport('hist_017');const payload=JSON.parse(ctx.messages[1].content.split('\n')[0]);const qs=payload.按模块组织的实际答卷['系统 / 维度 / 模块'];
 assert.equal(qs[0].已保存得分,70);assert.equal(qs[0].缺少观察,true);assert.equal(qs[1].实际回答,'比较不符合');assert.equal(qs[1].已保存得分,90);
 assert.ok(!JSON.stringify(ctx.messages).includes('PRIVATE_'));assert.equal(ctx.snapshot.bottleneck,'动力');assert.ok(ctx.messages[0].content.includes('不显示任何测评分数'));assert.ok(ctx.messages[1].content.includes('7500—8000'));
 assessment.payment.status='PENDING';await assert.rejects(()=>pipeline.prepareReport('hist_017'),/确认付款/);assessment.payment.status='CONFIRMED';
 assessment.source='website';await pipeline.prepareReport('hist_017');
 assessment.answerRecords[1].score=30;await assert.rejects(()=>pipeline.prepareReport('hist_017'),/保存分值/);
 assessment.answerRecords.pop();await assert.rejects(()=>pipeline.prepareReport('hist_017'),/答卷不完整/);
 console.log('PASS 六章层级、两类分支、真实选项、Q27历史70分、Q62否定方向、联系方式隔离、付款门槛、版本分值检查、答卷完整性；未调用AI或数据库。');
})().catch(e=>{console.error(e);process.exitCode=1;});
