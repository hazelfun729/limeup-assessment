// Local-only API regression; owns and removes its fixtures. No email is sent.
require('dotenv').config({quiet:true});
const {Client}=require('pg'),{randomBytes,createHash}=require('crypto'),assert=require('node:assert/strict');
const base='http://127.0.0.1:3001',tag='letter_fields_'+randomBytes(8).toString('hex');
const db=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:15000});
(async()=>{await db.connect();try{
 const v=(await db.query('SELECT id FROM "QuestionVersion" WHERE "isActive"=true LIMIT 1')).rows[0].id;
 await db.query('INSERT INTO "User"(id,email,"emailVerified","updatedAt") VALUES($1,$2,true,now())',[tag,tag+'@example.invalid']);
 for(const id of [tag,tag+'_legacy'])await db.query('INSERT INTO "Assessment"(id,"userId","questionVersionId",status,"completedAt",source) VALUES($1,$2,$3,\'COMPLETED\',now(),\'field-test\')',[id,tag,v]);
 const token=randomBytes(32).toString('hex');await db.query('INSERT INTO "AuthSession"("tokenHash",kind,"subjectId","expiresAt") VALUES($1,\'USER\',$2,now()+interval \'1 hour\')',[createHash('sha256').update(token).digest('hex'),tag]);
 async function request(id,answers){const r=await fetch(`${base}/api/consultation/${id}`,{method:answers?'POST':'GET',headers:{Cookie:`user_session=${token}`,Origin:base,'Content-Type':'application/json'},...(answers?{body:JSON.stringify({answers})}:{})});return {status:r.status,data:await r.json()};}
 assert.equal((await request(tag,['a','b','c','d',7])).status,400);
 assert.equal((await request(tag,['a','b','c','d',' 补充内容 '])).status,200);
 assert.deepEqual((await request(tag)).data.letter.answers,['a','b','c','d','补充内容']);
 assert.equal((await request(tag,['a','b','c','d','不能覆盖'])).status,200);
 assert.equal((await request(tag)).data.letter.answers[4],'补充内容');
 assert.equal((await request(tag+'_legacy',['a','b','c','d'])).status,200);
 assert.deepEqual((await request(tag+'_legacy')).data.letter.answers,['a','b','c','d','']);
 console.log('PASS 7 live consultation checks: fifth field saved, optional/legacy accepted, invalid rejected, duplicates immutable');
}finally{await db.query('DELETE FROM "AuthSession" WHERE "subjectId"=$1',[tag]);await db.query('DELETE FROM "Assessment" WHERE "userId"=$1',[tag]);await db.query('DELETE FROM "User" WHERE id=$1',[tag]);await db.end();console.log('Owned fixtures removed');}})().catch(e=>{console.error(e.message);process.exitCode=1});
