// Run against a local server connected to Supabase. Fixtures use .invalid emails;
// no email delivery or AI calls occur. All owned fixture rows are removed in finally.
require('dotenv').config({ quiet: true });
const { Client } = require('pg');
const { randomBytes, createHash } = require('crypto');
const bcrypt = require('bcryptjs');
const assert = require('node:assert/strict');
const fs = require('fs');
if (process.env.PUBLIC_SITE_URL) throw Error('Run regression in local mail preview mode only');
if (process.env.AI_API_KEY) throw Error('Run regression with AI_API_KEY unset; payment confirmation must not call a paid model');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3003';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) throw Error('Local preview only');
const tag = 'regression_' + randomBytes(8).toString('hex');
const uid = tag + '_user', otherId = tag + '_other', adminId = tag + '_admin';
const hash = s => createHash('sha256').update(s).digest('hex');
const db = new Client({ connectionString: process.env.DATABASE_URL, statement_timeout: 20000 });
const results = []; let aid;
async function request(path, { method = 'GET', cookie, body, headers = {} } = {}) {
  const response = await fetch(base + path, { method, headers: { Origin:base, ...(cookie ? {Cookie:cookie}:{}), ...(body !== undefined ? {'Content-Type':'application/json'}:{}), ...headers }, ...(body !== undefined ? {body:JSON.stringify(body)}:{}), redirect:'manual', signal:AbortSignal.timeout(60000) });
  const text = await response.text(); let data; try { data = JSON.parse(text); } catch { data = {}; }
  return {status:response.status, data, headers:response.headers, text};
}
function check(name, condition) { assert.ok(condition, name); results.push(name); console.log('PASS', name); }
async function issue(kind, subjectId) { const token=randomBytes(32).toString('hex'); await db.query('INSERT INTO "AuthSession"("tokenHash",kind,"subjectId","expiresAt") VALUES($1,$2,$3,now()+interval \'1 hour\')',[hash(token),kind,subjectId]); return token; }
(async () => {
await db.connect();
try {
 const pass=randomBytes(20).toString('hex');
 await db.query('INSERT INTO "User"(id,email,"emailVerified","verificationCode","codeExpiresAt","updatedAt") VALUES($1,$2,false,$3,now()+interval \'5 minutes\',now()),($4,$5,true,NULL,NULL,now())',[uid,uid+'@example.invalid','123456',otherId,otherId+'@example.invalid']);
 await db.query('INSERT INTO "Admin"(id,username,email,"passwordHash",role,"updatedAt") VALUES($1,$1,$2,$3,\'SUPER_ADMIN\',now())',[adminId,adminId+'@example.invalid',await bcrypt.hash(pass,10)]);
 let r=await request('/api/admin/login',{method:'POST',body:{login:adminId,password:pass}});
 check('管理员实际登录成功，签发 HttpOnly 随机会话',r.status===200 && /HttpOnly/i.test(r.headers.get('set-cookie')));
 const adminCookie=r.headers.get('set-cookie').split(';')[0];
 const adminPaths=['dashboard','users','reports','payments','crm','prompts','questions','thresholds','emails','logs','assessments','settings','stats','account','admins','consultations','profile-mails'];
 for(const name of adminPaths) {
   const values=await Promise.all([request('/api/admin/'+name), request('/api/admin/'+name,{cookie:'admin_session=fake'}), request('/api/admin/'+name,{cookie:adminCookie})]);
   check('后台 '+name+'：匿名/伪造拒绝，真实管理员可用',values[0].status===401 && values[1].status===401 && values[2].status===200);
 }
 r=await request('/api/admin/account',{cookie:'admin_session='+adminId});check('数据库管理员 ID 不能充当登录凭证',r.status===401);
 for(const [path,method] of [['users/none','GET'],['questions/none','PUT'],['payments/none/confirm','POST'],['payments/batch-confirm','POST'],['reports/batch-send','POST'],['reports/batch-generate','POST'],['reports/none','PUT'],['prompts/none/publish','POST'],['crm/none/followup','POST']]) {
   r=await request('/api/admin/'+path,{method,cookie:'admin_session=fake',...(method==='GET'?{}:{body:{}})});
   check('伪造凭证不能调用 '+method+' '+path,r.status===401);
 }
 const key=randomBytes(32).toString('hex'); aid=`a${hash(key).slice(0,32)}`;
 const starts=await Promise.all([1,2,3].map(()=>request('/api/assessment',{method:'POST',headers:{'Idempotency-Key':key}})));
 check('并发三次开始测评只生成一个 ID',starts.every(x=>x.status===200 && x.data.id===aid));
 check('数据库只有一条测评记录',(await db.query('SELECT count(*)::int n FROM "Assessment" WHERE id=$1',[aid])).rows[0].n===1);
 const guestCookie=starts[0].headers.get('set-cookie').split(';')[0];
 r=await request('/api/assessment/'+aid+'/test-mode',{method:'POST',cookie:guestCookie});check('普通用户不能启用测试填充',r.status===401);
 r=await request('/api/assessment/'+aid+'/test-mode',{method:'POST',cookie:adminCookie});check('管理员不能标记他人测评',r.status===403);
 r=await request('/api/assessment/'+aid+'/test-mode',{method:'POST',cookie:adminCookie+'; '+guestCookie});check('管理员可标记自己新建的前台测试',r.status===200);
 check('测试记录保存管理员来源标记',(await db.query('SELECT source FROM "Assessment" WHERE id=$1',[aid])).rows[0].source==='admin-test:'+adminId);

 r=await request('/api/assessment/'+aid);check('匿名无法读取他人测评',r.status===403);
 r=await request('/api/assessment/'+aid,{cookie:guestCookie});check('测评本人可读取题库',r.status===200 && r.data.questions.length===66);
 const otherCookie='user_session='+await issue('USER',otherId);
 for(const path of ['/api/assessment/','/api/profile/','/api/payment/','/api/status/']) {
   r=await request(path+aid,{cookie:otherCookie});check('其他用户不能访问 '+path,r.status===403);
 }
 r=await request('/api/assessment/'+aid,{method:'PUT',cookie:otherCookie,body:{answers:{1:'ALWAYS'},currentQuestion:1}});check('其他用户不能修改答案',r.status===403);
 r=await request('/api/assessment/'+aid,{method:'PUT',cookie:guestCookie,body:{answers:{1:'INVALID'},currentQuestion:1}});check('非法答案被拒绝且不写入',r.status===400 && (await db.query('SELECT count(*)::int n FROM "AssessmentAnswer" WHERE "assessmentId"=$1',[aid])).rows[0].n===0);
 r=await request('/api/assessment/'+aid,{method:'PUT',cookie:guestCookie,body:{answers:{1:'ALWAYS'},currentQuestion:999}});check('非法进度被拒绝',r.status===400);
 const questions=(await db.query('SELECT q."order",q."scoreValues" FROM "Question" q JOIN "Assessment" a ON q."versionId"=a."questionVersionId" WHERE a.id=$1 AND q."isActive" ORDER BY q."order"',[aid])).rows;
 const answers=Object.fromEntries(questions.map(q=>[q.order,Object.keys(q.scoreValues)[0]]));
 check('新测评第11题采用最终反向计分',questions.find(q=>q.order===11).scoreValues.ALWAYS===0);
 const unknownAnswers=Object.fromEntries(questions.map(q=>[q.order,'UNKNOWN']));
 r=await request('/api/assessment/'+aid,{method:'PUT',cookie:guestCookie,body:{answers:unknownAnswers,currentQuestion:66}});check('不了解选项允许保存',r.status===200);
 r=await request('/api/auth/register',{method:'POST',cookie:guestCookie,body:{email:uid+'@example.invalid',code:'123456',assessmentId:aid}});check('全不了解不能生成虚假画像',r.status===400 && r.data.error.includes('不了解'));
 await db.query('DELETE FROM "AssessmentAnswer" WHERE "assessmentId"=$1',[aid]);

 r=await request('/api/assessment/'+aid,{method:'PUT',cookie:guestCookie,body:{answers:Object.fromEntries(Object.entries(answers).slice(0,20)),currentQuestion:21}});check('第一阶段答案保存成功',r.status===200);
 r=await request('/api/assessment/'+aid,{cookie:guestCookie});check('重新读取恢复第 21 题和 20 个答案',r.data.currentQuestion===21 && Object.keys(r.data.answers).length===20);
 r=await request('/api/auth/register',{method:'POST',cookie:guestCookie,body:{email:uid+'@example.invalid',code:'123456',assessmentId:aid}});check('未答完不能注册绑定为已完成',r.status===400);
 r=await request('/api/assessment/'+aid,{method:'PUT',cookie:guestCookie,body:{answers,currentQuestion:66}});check('66 道答案一次保存成功',r.status===200);
 r=await request('/api/auth/verify-and-register',{method:'POST',cookie:guestCookie,body:{email:uid+'@example.invalid',code:'123456',assessmentId:aid}});check('完整测评注册绑定成功',r.status===200);
 const userCookie=r.headers.get('set-cookie').split(';')[0];
 r=await request('/api/user/dashboard',{cookie:userCookie});check('用户成长档案包含本人已完成测评',r.status===200 && r.data.assessments.some(a=>a.id===aid && a.status==='COMPLETED'));
 r=await request('/api/user/dashboard',{cookie:'user_session='+uid});check('数据库用户 ID 不能伪造登录',r.status===401);
 r=await request('/api/assessment/'+aid,{cookie:guestCookie});check('绑定后撤销匿名测评访问权限',r.status===403);
 r=await request('/api/assessment/'+aid,{method:'PUT',cookie:userCookie,body:{answers,currentQuestion:66}});check('已完成测评不能再改答案',r.status===409);
 r=await request('/api/assessment/link',{method:'POST',cookie:otherCookie,body:{assessmentId:aid}});check('不能把他人测评重新绑定到自己',r.status===403);
 r=await request('/api/profile/'+aid,{cookie:userCookie});check('完整测评可生成真实成长画像',r.status===200 && r.data.systems?.length===3 && !r.data.moduleScores);
 check('画像使用正式版本且不返回场景问题',r.data.version==='2026-09-16' && !('questions' in r.data) && r.data.copy.paragraphs.length===3);
 r=await request('/api/consultation/'+aid,{cookie:otherCookie});check('其他用户不能读取咨询信',r.status===403);
 r=await request('/api/consultation/'+aid,{method:'POST',cookie:otherCookie,body:{answers:['a','b','c','d']}});check('其他用户不能提交咨询信',r.status===403);
 r=await request('/api/consultation/'+aid,{method:'POST',cookie:userCookie,body:{answers:['']}});check('咨询表单校验四项内容',r.status===400);
 const letters=await Promise.all([1,2,3].map(()=>request('/api/consultation/'+aid,{method:'POST',cookie:userCookie,body:{answers:['期待','最近的事情','试过的方法','欣赏孩子','其他补充']}})));
 check('咨询信并发提交只保存一封',letters.every(x=>x.status===200&&x.data.id===letters[0].data.id));
 r=await request('/api/consultation/'+aid,{cookie:userCookie});check('本人可查看来信但不泄露后台回信草稿',r.status===200&&r.data.letter.answers.length===5&&!('reply' in r.data.letter));
 r=await request('/api/admin/consultations/'+letters[0].data.id+'/reply',{method:'POST',cookie:userCookie,body:{reply:'测试'}});check('普通用户不能发管理员回信',r.status===401);
 r=await request('/api/admin/profile-mails?assessmentId='+aid,{cookie:adminCookie});check('管理员可预览画像邮件且无模块评分',r.status===200&&r.text.includes('写咨询信')&&r.text.includes('39.9')&&!r.text.includes('M_AUTONOMY'));
 r=await request('/api/admin/profile-mails',{method:'POST',cookie:adminCookie,body:{assessmentId:aid}});check('本地模式禁止正式发送画像邮件',r.status===409);

 r=await request('/api/payment/'+aid,{method:'POST',cookie:userCookie,body:{wechatOrderSuffix:'123'}});check('微信支付订单号后六位必填且须为数字',r.status===400);
 r=await request('/api/payment/'+aid,{method:'POST',cookie:userCookie,body:{wechatOrderSuffix:'123456'}});check('本人可创建待确认订单',r.status===200 && r.data.status==='PENDING');const pid=r.data.id;
 r=await request('/api/payment/'+aid,{method:'POST',cookie:userCookie,body:{wechatOrderSuffix:'123456'}});check('重复提交付款不会重复创建订单',r.status===200 && r.data.id===pid);
 r=await request('/api/admin/payments/'+pid+'/confirm',{method:'POST',cookie:adminCookie});
 const reportRow=(await db.query('SELECT id,status FROM "GrowthHandbook" WHERE "assessmentId"=$1',[aid])).rows[0];
 check('AI 未配置时付款仍确认且报告任务保留可重试',r.status===502 && reportRow?.status==='FAILED' &&
   (await db.query('SELECT status FROM "Payment" WHERE id=$1',[pid])).rows[0].status==='CONFIRMED');const hid=reportRow.id;
 r=await request('/api/admin/payments/'+pid+'/confirm',{method:'POST',cookie:adminCookie});
 check('重复确认复用原报告，不新增付款或报告',r.status===502 && (await db.query('SELECT count(*)::int n FROM "GrowthHandbook" WHERE "assessmentId"=$1',[aid])).rows[0].n===1);
 await db.query('UPDATE "GrowthHandbook" SET status=\'ANALYZING\' WHERE id=$1',[hid]);
 r=await request('/api/status/'+aid,{cookie:userCookie});check('付款确认后状态正确进入分析中',r.data.currentStatus==='ANALYZING');
 r=await request('/api/reports/'+hid,{cookie:userCookie});check('未发送的报告正文对用户不可见',r.status===409&&!r.text.includes('contentHtml'));
 r=await request('/api/reports/'+hid+'/document',{cookie:userCookie});check('未发送的报告 HTML 对用户不可下载',r.status===409&&!r.text.includes('<!doctype html>'));
 await db.query('UPDATE "GrowthHandbook" SET "contentHtml"=$1,status=\'SENT\' WHERE id=$2',['<h2>测试报告</h2><p>内容</p><script>window.stolen=true</script><img src=x onerror="alert(1)"><a href="javascript:alert(1)">link</a>',hid]);
 r=await request('/api/reports/'+hid,{cookie:otherCookie});check('其他用户不能读取成长报告',r.status===403);
 r=await request('/api/reports/'+hid,{cookie:userCookie});check('本人报告能打开且过滤脚本和事件',r.status===200 && !/script|onerror|javascript:/i.test(r.data.handbook.contentHtml) && /测试报告/.test(r.data.handbook.contentHtml));
 r=await request('/api/status/'+aid,{cookie:userCookie});check('报告发送状态正确返回 SENT',r.data.currentStatus==='SENT');
 await db.query('UPDATE "Payment" SET status=\'REFUNDED\' WHERE id=$1',[pid]);
 r=await request('/api/status/'+aid,{cookie:userCookie});check('退款不再错误显示分析中',r.data.currentStatus==='REFUNDED');
 r=await request('/api/status/not-found');check('不存在的测评返回 404',r.status===404);
 r=await request('/api/assessment/test',{method:'POST',body:{}});check('测试造数入口关闭',r.status===410);
 r=await request('/api/assessment/'+aid,{method:'PUT',cookie:userCookie,headers:{Origin:'https://outside.example'},body:{answers,currentQuestion:66}});check('跨站写请求被拒绝',r.status===403);
 await request('/api/auth/logout',{method:'POST',cookie:userCookie});r=await request('/api/user/dashboard',{cookie:userCookie});check('退出后旧用户会话无法重放',r.status===401);
 await request('/api/admin/login',{method:'DELETE',cookie:adminCookie});r=await request('/api/admin/account',{cookie:adminCookie});check('退出后旧管理员会话无法重放',r.status===401);
 console.log('TOTAL PASSED',results.length);
 fs.writeFileSync('docs/regression-results.json',JSON.stringify({testedAt:new Date().toISOString(),base,passed:results.length,checks:results},null,2));
} finally {
 await db.query('BEGIN');
 try {
  if(aid){
   await db.query('DELETE FROM "SiteConfig" WHERE key LIKE $1 OR key=$2 OR key=$3',[`report:run:${aid}:%`,`report:lock:${aid}`,`report:job:${aid}`]);
   for(const t of ['GrowthHandbook','GrowthProfile','Payment','AssessmentAnswer'])await db.query(`DELETE FROM "${t}" WHERE "assessmentId"=$1`,[aid]);await db.query('DELETE FROM "Assessment" WHERE id=$1',[aid]);
  }
  await db.query('DELETE FROM "CRMContact" WHERE "userId"=ANY($1::text[])',[[uid,otherId]]);
  await db.query('DELETE FROM "AuthSession" WHERE "subjectId"=ANY($1::text[])',[[uid,otherId,adminId,aid].filter(Boolean)]);
  for(const identity of [adminId,uid+'@example.invalid',otherId+'@example.invalid']) { const bucket=Math.floor(Date.now()/300000);for(let offset=0;offset<10;offset++)await db.query('DELETE FROM "AuthRateLimit" WHERE key=$1',[hash(`verify:${identity.toLowerCase()}:${bucket-offset}`)]); }
  await db.query('DELETE FROM "OperationLog" WHERE "adminId"=$1',[adminId]);
  await db.query('DELETE FROM "User" WHERE id=ANY($1::text[])',[[uid,otherId]]);
  await db.query('DELETE FROM "Admin" WHERE id=$1',[adminId]);
  await db.query('COMMIT');console.log('Owned test fixtures removed.');
 } catch(e){await db.query('ROLLBACK');throw e}
 await db.end();
}
})().catch(e=>{console.error(e);process.exitCode=1});
