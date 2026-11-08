// Isolated production-code tests: no network, database, browser or real email.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const settings = new Map(), messages = [];
let smtpFails = false, rioMode = 'success', transaction = Promise.resolve();
let fetchBehavior = async () => { throw Error('Unexpected external request'); };
const isolatedProcess = { env: { VOLVO_RFMS_USERNAME: 'test-user', VOLVO_RFMS_PASSWORD: 'test-password' }, argv: ['node', 'isolated-test'] };
const prisma = {
  setting: {
    findUnique: async ({where}) => settings.has(where.key) ? {value:settings.get(where.key)} : null,
    create: async ({data}) => { if(settings.has(data.key)) throw {code:'P2002'}; settings.set(data.key,data.value); },
    update: async ({where,data}) => { settings.set(where.key,data.value); },
    upsert: async ({where,create,update}) => { settings.set(where.key,settings.has(where.key)?update.value:create.value); },
  },
  $executeRaw: async () => 1,
  $transaction: fn => { const result=transaction.then(()=>fn(prisma)); transaction=result.catch(()=>{}); return result; },
};
const assets=[{assetId:'a',truckNumber:'TEST-A',label:'A'},{assetId:'b',truckNumber:'TEST-B',label:'B'}];
const mocks={
  '@/lib/prisma': {prisma},
  '@/lib/email': {sendHtmlEmail:async mail => {if(smtpFails) throw Error('synthetic SMTP timeout');messages.push(mail);}},
  '@/data/rio-assets': {RIO_ASSETS:assets,findRioAssetByTruckNumber:n=>assets.find(a=>a.truckNumber===n)},
  '@/lib/rio-import': {importRioHistoryPositions:async ({truckNumber}) => {if(rioMode==='missing' && truckNumber==='TEST-B' || rioMode==='all-missing') throw new MissingTargetError('No local driver');if(rioMode==='partial' && truckNumber==='TEST-B') throw Error('synthetic vehicle import failure');return {scannedPoints:0,savedPoints:0,skippedNearExisting:0,skippedDuplicateSource:0};}},
  '@/lib/rio-portal': {withRioPortal:async fn => {if(rioMode==='fatal')throw Error('synthetic portal login failure');return fn({fetchHistoricEvents:async()=>({historic_events:[]})});}},
  'dotenv/config': {},
};
const cache={};
function load(name, base=root) {
  if (name in mocks) return mocks[name];
  const file=name.startsWith('@/')?path.join(root,name.slice(2))+'.ts':name.startsWith('.')?path.resolve(base,name)+'.ts':null;
  if (!file) return require(name);
  const alias='@/'+path.relative(root,file).replace(/\.ts$/,'');
  if(alias in mocks)return mocks[alias];
  if(cache[file])return cache[file].exports;
  const mod={exports:{}};cache[file]=mod;
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  vm.runInThisContext('(function(require,module,exports,setTimeout,fetch,process){'+code+'\n})',{filename:file})(n=>load(n,path.dirname(file)),mod,mod.exports,fn=>{fn();return 0;},(...args)=>fetchBehavior(...args),isolatedProcess);
  return mod.exports;
}
const health=load('@/lib/volvo-rfms-health'), alert=load('@/lib/integration-alerts'), rioAlert=load('@/lib/rio-nightly-alerts');
const runner=load('@/scripts/rio-nightly-runner');
const {RioImportTargetMissingError:MissingTargetError}=load('@/lib/rio-import-errors');
const time=m=>new Date(Date.UTC(2026,10,8,9,m));
const event=(m,ok)=>({startedAt:time(m),finishedAt:time(m),ok,error:ok?undefined:'network unavailable'});
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS',name);}
(async()=>{
 await test('brief failures and intermittent successful polls do not open incidents',()=>{
   let s={...health.INITIAL_VOLVO_HEALTH};
   for(let i=0;i<60;i+=5)s=health.advanceVolvoHealth(s,event(i,i%15===10));
   assert.equal(s.incidentId,null);
 });
 await test('six quick retries cannot bypass the 30 minute threshold',()=>{
   let s={...health.INITIAL_VOLVO_HEALTH};for(let i=0;i<10;i++)s=health.advanceVolvoHealth(s,event(i,false));assert.equal(s.incidentId,null);
 });
 await test('one sustained incident produces exactly one mail across repeated observations',async()=>{
   for(let i=0;i<30;i+=5)await health.recordVolvoApiOutcome(event(i,false));assert.equal(messages.length,0);
   await health.recordVolvoApiOutcome(event(30,false));assert.equal(messages.length,1);
   await health.recordVolvoApiOutcome(event(35,false));assert.equal(messages.length,1);
   await health.recordVolvoApiOutcome(event(40,true));await health.recordVolvoApiOutcome(event(45,false));assert.equal(messages.length,1);
 });
 await test('stable recovery is silent, then a genuinely new incident can notify',async()=>{
   for(const i of [50,55,60])await health.recordVolvoApiOutcome(event(i,true));
   assert.equal(JSON.parse(settings.get(health.VOLVO_HEALTH_STATE_KEY)).incidentId,null);assert.equal(messages.length,1);
   for(let i=65;i<=95;i+=5)await health.recordVolvoApiOutcome(event(i,false));assert.equal(messages.length,2);
 });
 await test('out-of-order results and long gaps do not manufacture a failure streak',()=>{
   let s={...health.INITIAL_VOLVO_HEALTH};s=health.advanceVolvoHealth(s,event(10,true));assert.equal(health.advanceVolvoHealth(s,event(5,false)),s);
   s=health.advanceVolvoHealth(s,event(15,false));s=health.advanceVolvoHealth(s,event(40,false));assert.equal(s.failures,1);
 });
 await test('empty successful API result is healthy, errors retain safe categories',async()=>{
   const result=await health.observeVolvoApiFetch(async()=>({positions:[]}));assert.equal(result.positions.length,0);
   assert.ok(health.describeVolvoFailure(new Error('Volvo rFMS 401: secret response')).includes('401'));
   assert.ok(!health.describeVolvoFailure(new Error('Volvo rFMS 401: secret response')).includes('secret'));
   assert.ok(health.describeVolvoFailure(new Error('Volvo rFMS 429: limit')).includes('429'));
 });
 await test('Volvo HTTP calls have a timeout and accept empty/204 responses',async()=>{
   const client=load('@/lib/volvo-rfms');
   fetchBehavior=async (url,options)=>{assert.ok(options.signal instanceof AbortSignal);return {ok:true,status:204};};
   const empty=await client.fetchVolvoVehiclePositionsSince({starttime:'2026-11-08T00:00:00Z',bypassCache:true});assert.equal(empty.positions.length,0);
   fetchBehavior=async()=>({ok:true,status:200,json:async()=>({VehiclePosition:[]})});
   assert.equal((await client.fetchVolvoVehiclePositionsSince({starttime:'2026-11-08T00:00:00Z',bypassCache:true})).positions.length,0);
   fetchBehavior=async()=>({ok:true,status:200,json:async()=>({VehiclePosition:'invalid'})});
   await assert.rejects(client.fetchVolvoVehiclePositionsSince({starttime:'2026-11-08T00:00:00Z',bypassCache:true}),/invalid response/);
 });
 await test('concurrent attempts share a durable email claim; uncertain SMTP does not spam',async()=>{
   const before=messages.length;
   await Promise.all([alert.sendIntegrationAlertOnce('test-concurrent','Test','body'),alert.sendIntegrationAlertOnce('test-concurrent','Test','body')]);assert.equal(messages.length,before+1);
   smtpFails=true;await assert.rejects(alert.sendIntegrationAlertOnce('test-smtp','Test','body'));smtpFails=false;
   assert.equal(await alert.sendIntegrationAlertOnce('test-smtp','Test','body'),false);
   assert.equal(JSON.parse(settings.get('integration_alert:test-smtp')).status,'delivery_unconfirmed');
 });
 await test('successful empty RIO report is silent and records completion',async()=>{
   const before=messages.length;rioMode='success';await runner.runRioNightlyImport({date:'2026-11-01',notifyOnFailure:true});
   assert.equal(messages.length,before);assert.equal(JSON.parse(settings.get('rio_scheduled_run:2026-11-01')).status,'success');
 });
 await test('partial RIO failure lists affected truck and sends once per date',async()=>{
   const before=messages.length;rioMode='partial';await runner.runRioNightlyImport({date:'2026-11-02',notifyOnFailure:true});await runner.runRioNightlyImport({date:'2026-11-02',notifyOnFailure:true});
   assert.equal(messages.length,before+1);assert.ok(messages.at(-1).text.includes('TEST-B'));
   assert.equal(JSON.parse(settings.get('rio_nightly_status')).lastRunSuccess,false);
 });
 await test('successful retry clears RIO status silently without another mail',async()=>{
   const before=messages.length;rioMode='success';await runner.runRioNightlyImport({date:'2026-11-02',notifyOnFailure:true});assert.equal(messages.length,before);assert.equal(JSON.parse(settings.get('rio_scheduled_run:2026-11-02')).status,'success');
 });
 await test('fatal RIO failure saves a final failed state and alerts once',async()=>{
   const before=messages.length;rioMode='fatal';await assert.rejects(runner.runRioNightlyImport({date:'2026-11-03',notifyOnFailure:true}));
   assert.equal(messages.length,before+1);assert.ok(JSON.parse(settings.get('rio_nightly_status')).lastRunFinishedAt);
   assert.equal(JSON.parse(settings.get('rio_scheduled_run:2026-11-03')).status,'failed');
 });
 await test('full manual retry repairs the scheduled date; a single truck does not',async()=>{
   const before=messages.length;rioMode='success';
   await runner.runRioNightlyImport({date:'2026-11-03',truckNumber:'TEST-A'});
   assert.equal(JSON.parse(settings.get('rio_scheduled_run:2026-11-03')).status,'failed');
   await runner.runRioNightlyImport({date:'2026-11-03'});
   assert.equal(JSON.parse(settings.get('rio_scheduled_run:2026-11-03')).status,'success');assert.equal(messages.length,before);
 });
 await test('manual/dry-run failures never send automatic mail',async()=>{
   const before=messages.length;rioMode='fatal';await assert.rejects(runner.runRioNightlyImport({date:'2026-11-04',dryRun:true,notifyOnFailure:true}));await assert.rejects(runner.runRioNightlyImport({date:'2026-11-04'}));assert.equal(messages.length,before);
 });
 await test('RIO deadline detects missed/unfinished runs only after local 07:00',async()=>{
   settings.set('rio_nightly_status',JSON.stringify({enabled:true,lastRunResults:[]}));const before=messages.length;
   await rioAlert.checkRioNightlyDeadline(new Date('2026-03-29T06:59:00+02:00'));assert.equal(messages.length,before);
   await rioAlert.checkRioNightlyDeadline(new Date('2026-03-29T07:05:00+02:00'));assert.equal(messages.length,before+1);
   await rioAlert.checkRioNightlyDeadline(new Date('2026-03-29T07:20:00+02:00'));assert.equal(messages.length,before+1);
   await rioAlert.saveRioScheduledRun({date:'2026-11-07',status:'running',startedAt:'2026-11-08T00:40:00+01:00',finishedAt:null,failedTrucks:[],reason:null});
   await rioAlert.checkRioNightlyDeadline(new Date('2026-11-08T07:05:00+01:00'));assert.equal(messages.length,before+2);
 });
 await test('RIO disabled and completed full imports remain silent at deadline',async()=>{
   const before=messages.length;settings.set('rio_nightly_status',JSON.stringify({enabled:false}));await rioAlert.checkRioNightlyDeadline(new Date('2026-11-10T07:05:00+01:00'));
   settings.set('rio_nightly_status',JSON.stringify({enabled:true,lastRunDate:'2026-11-09',lastRunSuccess:true,lastRunFinishedAt:'2026-11-10T02:00:00Z',lastRunDryRun:false,lastRunResults:assets}));await rioAlert.checkRioNightlyDeadline(new Date('2026-11-10T07:05:00+01:00'));assert.equal(messages.length,before);
 });
 await test('nightly date follows Sarajevo midnight in winter and summer',()=>{
   assert.equal(runner.previousLocalDayString(new Date('2026-11-09T00:40:00+01:00')),'2026-11-08');
   assert.equal(runner.previousLocalDayString(new Date('2026-07-09T00:40:00+02:00')),'2026-07-08');
 });
 await test('missing local drivers are visible skips and never failure emails',async()=>{
   const before=messages.length;rioMode='missing';
   const result=await runner.runRioNightlyImport({date:'2026-11-12',notifyOnFailure:true});
   assert.equal(result.successfulAssets,1);assert.equal(result.skippedAssets,1);assert.equal(result.failedAssets,0);
   assert.equal(result.results[1].skippedReason,'No local driver');
   assert.equal(JSON.parse(settings.get('rio_scheduled_run:2026-11-12')).status,'success');
   settings.set('rio_nightly_status',JSON.stringify({...JSON.parse(settings.get('rio_nightly_status')),enabled:true}));
   await rioAlert.checkRioNightlyDeadline(new Date('2026-11-13T07:05:00+01:00'));
   assert.equal(messages.length,before);
 });
 await test('all missing targets are counted as skips, not successful imports',async()=>{
   const before=messages.length;rioMode='all-missing';
   const result=await runner.runRioNightlyImport({date:'2026-11-13',notifyOnFailure:true});
   assert.equal(result.successfulAssets,0);assert.equal(result.skippedAssets,2);assert.equal(result.failedAssets,0);
   assert.equal(messages.length,before);
 });
 await test('resolver distinguishes absent mapping from database failure',async()=>{
   const original=mocks['@/lib/rio-import'];delete mocks['@/lib/rio-import'];
   const {resolveRioImportTarget}=load('@/lib/rio-import');
   mocks['@/lib/rio-import']=original;
   prisma.truck={findMany:async()=>[]};
   prisma.driver={findUnique:async()=>null};
   await assert.rejects(resolveRioImportTarget({truckNumber:'UNKNOWN'}),MissingTargetError);
   await assert.rejects(resolveRioImportTarget({driverId:'UNKNOWN'}),MissingTargetError);
   prisma.truck.findMany=async()=>{throw Error('Database unavailable');};
   await assert.rejects(resolveRioImportTarget({truckNumber:'TEST-A'}),e=>!(e instanceof MissingTargetError)&&e.message==='Database unavailable');
 });
 console.log(`${passed} integration alert checks passed; all email and external services mocked.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
