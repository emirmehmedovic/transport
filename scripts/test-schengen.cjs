// Executes production TypeScript with an in-memory database; never connects to PostgreSQL.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
process.chdir(root);
let positions = [], stored = [], corrections = [];
const matches = (p, w) => (!w.driverId || p.driverId === w.driverId) && (!w.recordedAt?.gte || p.recordedAt >= w.recordedAt.gte) && (!w.recordedAt?.lte || p.recordedAt <= w.recordedAt.lte) && (!w.recordedAt?.lt || p.recordedAt < w.recordedAt.lt);
const db = {
  position: {
    findMany: async ({where}) => positions.filter(p => matches(p, where)),
    findFirst: async ({where}) => positions.filter(p => matches(p, where)).sort((a,b) => +b.recordedAt - +a.recordedAt)[0] ?? null,
  },
  schengenDay: {
    count: async () => 179,
    findMany: async ({where}) => stored.filter(p => p.driverId === where.driverId && p.date >= where.date.gte && p.date <= where.date.lte),
    deleteMany: async ({where}) => { stored = stored.filter(p => !(p.driverId === where.driverId && p.date >= where.date.gte && p.date <= where.date.lte)); },
    createMany: async ({data}) => { stored.push(...data); },
  },
  setting: { findUnique: async () => corrections.length ? {value: JSON.stringify(corrections)} : null },
  $transaction: async fn => fn(db),
};
const cache = {};
const mocks = {};
function load(name, base = root) {
  const file = name.startsWith('@/') ? path.join(root, name.slice(2)) + '.ts' : name.startsWith('.') ? path.resolve(base, name) + '.ts' : null;
  if (!file) return require(name);
  if (mocks[file]) return mocks[file];
  if (file === path.join(root, 'lib/prisma.ts')) return {prisma: db};
  if (cache[file]) return cache[file].exports;
  const mod = {exports:{}}; cache[file] = mod;
  const js = ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  vm.runInThisContext('(function(require,module,exports){'+js+'\n})',{filename:file})(n => load(n,path.dirname(file)), mod, mod.exports);
  return mod.exports;
}
const dates = load('@/lib/schengen-dates');
const agg = load('@/lib/schengen-aggregate');
const cycle = load('@/lib/schengen-cycle');
const border = load('@/lib/schengen-border');
const audit = load('@/lib/schengen-audit');
const p = (time, inside = true, accuracy = 10) => ({driverId:'d',deviceId:'volvo:test',latitude:inside?45.81:43.85,longitude:inside?15.98:18.4,accuracy,recordedAt:new Date(time)});
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS',name); }
const from = new Date('2026-11-08T00:00:00+01:00'), until = new Date('2026-11-12T12:00:00+01:00');
const count = ps => agg.countSchengenUsageDaysFromSignals({positions:ps,from,until});
test('23:55 to 00:10 counts two calendar days', () => assert.equal(count([p('2026-11-08T23:55:00+01:00'),p('2026-11-09T00:10:00+01:00')]),2));
test('duplicate positions count once', () => assert.equal(count([p('2026-11-08T23:55:00+01:00'),p('2026-11-08T23:56:00+01:00')]),1));
test('short return does not extrapolate to report date', () => assert.equal(count([p('2026-11-08T23:55:00+01:00'),p('2026-11-09T00:05:00+01:00'),p('2026-11-09T00:10:00+01:00',false)]),2));
test('border detector retains a confirmed rapid return', () => {
 const points=[p('2026-11-08T23:40:00+01:00',false),p('2026-11-08T23:55:00+01:00'),{...p('2026-11-09T00:00:00+01:00'),latitude:45.85,longitude:16.02},{...p('2026-11-09T00:05:00+01:00'),latitude:45.9,longitude:16.06},p('2026-11-09T00:10:00+01:00',false),{...p('2026-11-09T00:15:00+01:00',false),latitude:43.89,longitude:18.43},{...p('2026-11-09T00:20:00+01:00',false),latitude:43.93,longitude:18.46}];
 assert.deepEqual(border.detectBorderCrossings(points).map(c=>c.type),['EXIT_BIH','ENTRY_BIH']);
});
test('nightly observations never create today without evidence', () => assert.equal(count([p('2026-11-08T23:55:00+01:00')]),1));
test('rest days inside Schengen count; rest days in BiH do not', () => {
 assert.equal(count([p('2026-11-08T18:00:00+01:00'),p('2026-11-11T08:00:00+01:00')]),4);
 assert.equal(count([p('2026-11-08T18:00:00+01:00',false),p('2026-11-11T08:00:00+01:00',false)]),0);
});
test('carry-in observation fills continuous inside gap', () => assert.equal(count([p('2026-11-07T23:55:00+01:00'),p('2026-11-10T12:00:00+01:00')]),3));
test('bad GPS accuracy does not create a day', () => assert.equal(count([p('2026-11-08T12:00:00+01:00',true,1000)]),0));
test('future position excluded', () => assert.equal(count([p('2026-11-13T12:00:00+01:00')]),0));
test('180 inclusive dates, no reset, legacy saldo ignored', () => {
 const c=cycle.getSchengenCycleInfo(new Date('2026-11-08T23:30:00Z'));
 assert.equal(c.displayTo.toISOString().slice(0,10),'2026-11-09');
 assert.equal((+c.cycleEndExclusive - +c.cycleStart)/86400000,180);
 assert.equal(c.nextResetAt,null);
 const s=cycle.buildSchengenStatusSnapshot({manualRemainingDays:80,manualAsOf:new Date(),usageSinceCountFrom:91});
 assert.equal(s.usedDays,91); assert.equal(s.remainingDays,0); assert.equal(s.manual,null);
});
test('DST dates use local midnight, not 24 hour subtraction', () => {
 assert.equal(dates.localDayStart('2026-03-29').toISOString(),'2026-03-28T23:00:00.000Z');
 assert.equal(dates.localDayStart('2026-03-30').toISOString(),'2026-03-29T22:00:00.000Z');
 assert.equal(dates.localDayStart('2026-10-26').toISOString(),'2026-10-25T23:00:00.000Z');
});
test('audit uses same local date boundary', () => {
 const result=audit.buildSchengenAuditDayComparison({from:new Date('2026-11-08T23:55:00+01:00'),to:new Date('2026-11-09T00:10:00+01:00'),oemCoveredDays:['2026-11-08','2026-11-09'],internalCoveredDays:['2026-11-08','2026-11-09']});
 assert.equal(result.rows.length,2); assert.equal(result.summary.matchSchengen,2);
});
(async () => {
 positions=[p('2026-11-08T01:00:00+01:00'),p('2026-11-08T05:00:00+01:00',false)];
 await agg.aggregateSchengenDaysForDriver('d',new Date('2026-11-08T04:30:00+01:00'),until);
 assert.equal(stored.find(r=>r.date.toISOString().startsWith('2026-11-08')).inSchengen,true); passed++; console.log('PASS partial range reloads complete first day');
 stored.push({driverId:'d',date:new Date('2026-11-11T00:00:00Z'),inSchengen:true});
 await agg.aggregateSchengenDaysForDriver('d',from,until);
 assert.equal(stored.some(r=>r.date.toISOString().startsWith('2026-11-11')),false); passed++; console.log('PASS rebuild removes obsolete inferred days');
 positions.push(p('2026-11-12T10:00:00+01:00'));
 assert.equal(await agg.countSchengenDaysWithFallback('d',dates.dayKeyDate('2026-11-08'),until),2); passed++; console.log('PASS live overlay adds today before nightly aggregation');
 corrections=[{date:'2026-11-08',inSchengen:false},{date:'2026-11-09',inSchengen:true}];
 assert.equal(await agg.countSchengenDaysWithFallback('d',dates.dayKeyDate('2026-11-08'),until),2); passed++; console.log('PASS dated corrections override evidence without resetting a balance');
 const freshnessModule = load('@/lib/schengen-freshness');
 corrections=[];
 positions=[p('2026-11-12T11:55:00+01:00')];
 const live=await freshnessModule.getSchengenFreshness('d',null,until,{lastRunResults:[]});
 assert.equal(live.stale,false); assert.equal(live.todayRecorded,true);
 assert.equal(freshnessModule.entryToday(89,true).usedDaysIncludingToday,89);
 assert.equal(freshnessModule.entryToday(90,false).withinLimit,false);
 passed++; console.log('PASS live freshness and hypothetical entry avoid double counting');
 const asset=load('@/data/rio-assets').RIO_ASSETS[0];
 positions=[{...p('2026-11-11T23:55:00+01:00'),deviceId:'rio:test'}];
 const nightly=await freshnessModule.getSchengenFreshness('d',asset.truckNumber,until,{lastRunDate:'2026-11-11',lastRunFinishedAt:'2026-11-12T00:00:00Z',lastRunDryRun:false,lastRunResults:[{assetId:asset.assetId}]});
 assert.equal(nightly.importComplete,true); assert.equal(nightly.todayRecorded,false); assert.equal(nightly.assumedStillInside,true);
 const imported={lastRunDate:'2026-11-11',lastRunFinishedAt:'2026-11-12T00:00:00Z',lastRunDryRun:false,lastRunResults:[{assetId:asset.assetId,scannedPoints:0}]};
 const byPlate=await freshnessModule.getSchengenFreshness('d','240923-0725',until,imported,asset.truckNumber.toLowerCase().replaceAll('-',' '));
 assert.equal(byPlate.importComplete,true);assert.equal(byPlate.stale,false);
 const unknown=await freshnessModule.getSchengenFreshness('d','240923-0725',until,imported,'UNKNOWN');
 assert.equal(unknown.importComplete,false);
 const failedPlate=await freshnessModule.getSchengenFreshness('d','240923-0725',until,{...imported,lastRunResults:[{assetId:asset.assetId,error:'Import failed'}]},asset.truckNumber);
 assert.equal(failedPlate.importComplete,false);
 const oldDate=await freshnessModule.getSchengenFreshness('d','240923-0725',until,{...imported,lastRunDate:'2026-11-10'},asset.truckNumber);
 assert.equal(oldDate.importComplete,false);
 passed++;console.log('PASS plate matches internal fleet IDs without hiding unknown, failed or wrong-date imports');
 positions=[{...p('2026-11-09T18:00:00+01:00'),deviceId:'rio:test'}];
 const rest=await freshnessModule.getSchengenFreshness('d',asset.truckNumber,until,{lastRunDate:'2026-11-11',lastRunFinishedAt:'2026-11-12T00:00:00Z',lastRunDryRun:false,lastRunResults:[{assetId:asset.assetId,scannedPoints:0}]});
 assert.equal(rest.stale,false); assert.equal(rest.importComplete,true); assert.ok(rest.note.includes('odmora')); assert.equal(rest.todayRecorded,false);
 passed++; console.log('PASS successful empty nightly report is not a data failure on rest days');
 const skipped=await freshnessModule.getSchengenFreshness('d',asset.truckNumber,until,{lastRunDate:'2026-11-11',lastRunFinishedAt:'2026-11-12T00:00:00Z',lastRunDryRun:false,lastRunResults:[{assetId:asset.assetId,skippedReason:'No local driver'}]});
 assert.equal(skipped.importComplete,false);assert.equal(skipped.stale,true);
 passed++;console.log('PASS skipped target does not certify Schengen data as complete');
 positions=[p('2026-11-09T18:00:00+01:00')];
 const liveRest=await freshnessModule.getSchengenFreshness('d',null,until,{lastRunResults:[]});
 assert.equal(liveRest.stale,false); assert.equal(liveRest.noRecentPositions,true); assert.ok(liveRest.note.includes('odmor'));
 passed++; console.log('PASS old live position is a neutral no-movement notice');
 positions=[{...p('2026-11-09T18:00:00+01:00'),deviceId:'rio:test'}];
 const failed=await freshnessModule.getSchengenFreshness('d',asset.truckNumber,until,{lastRunDate:'2026-11-10',lastRunFinishedAt:null,lastRunResults:[]});
 assert.equal(failed.stale,true); assert.equal(failed.importComplete,false);
 passed++; console.log('PASS nightly success and delayed import remain distinct from today');
 mocks[path.join(root,'lib/email.ts')]={sendHtmlEmail:async()=>{throw Error('Unexpected email send in test');}};
 const reports=load('@/lib/schengen-weekly-email');
 const row={driverId:'d',name:'Test <Driver>',email:'test@example.invalid',status:'ACTIVE',truckNumber:'TEST',usedDays:89,remainingDays:1,warning:true,manual:null,nextResetAt:null,freshness:nightly,entryToday:freshnessModule.entryToday(89,false),legacyManualIgnored:false};
 const reportParams={generatedAt:until.toISOString(),rows:[row],borderCrossingsByDriver:new Map()};
 const html=reports.buildWeeklySchengenReportHtml(reportParams), text=reports.buildWeeklySchengenReportText(reportParams);
 assert.ok(html.includes('Test &lt;Driver&gt;')); assert.ok(html.includes('Noćni import')); assert.ok(text.includes('poslije') || text.includes('nakon današnjeg'));
 assert.ok(html.includes('Dnevni Schengen')); assert.ok(!html.includes('Reset:'));
 const mobileParams={...reportParams, rows:[
   {...row,driverId:'long',name:'Primjer dugog imena i prezimena vozača',usedDays:35,remainingDays:55,freshness:liveRest,entryToday:freshnessModule.entryToday(35,false)},
   row,
   {...row,driverId:'missing',name:'Primjer nepotpunih podataka',usedDays:82,remainingDays:8,freshness:failed,entryToday:freshnessModule.entryToday(82,false)},
 ]};
 const preview=reports.buildWeeklySchengenReportHtml(mobileParams);
 const plain=reports.buildWeeklySchengenReportText(mobileParams);
 assert.ok(preview.indexOf('Test &lt;Driver&gt;') < preview.indexOf('Primjer nepotpunih'));
 assert.ok(preview.indexOf('Primjer dugog') < preview.indexOf('Detalji po vozaču'));
 assert.ok(plain.indexOf('Primjer dugog') < plain.indexOf('DETALJI PO VOZAČU'));
 assert.ok(!preview.includes('<details') && !preview.includes('display:flex') && !preview.includes('petkom'));
 assert.ok(preview.includes('Provjeriti podatke') && preview.includes('odmor'));
 assert.ok(reports.buildWeeklySchengenReportHtml({...reportParams,rows:[]}).includes('Nema vozača za prikaz'));
 assert.deepEqual(mobileParams.rows.map(r=>r.driverId),['long','d','missing']);
 fs.writeFileSync('/tmp/transport-schengen-report-preview.html',preview);
 passed++; console.log('PASS daily HTML/text reports contain freshness, estimate and escaped names');
 const jobs=new Map(); let sends=0, failAggregation=false, failSend=false;
 db.setting.create=async ({data})=>{if(jobs.has(data.key)) throw {code:'P2002'};jobs.set(data.key,data.value);};
 db.setting.updateMany=async ({where,data})=>{const current=jobs.get(where.key); const match=typeof where.value==='string'?current===where.value:where.value.in.includes(current); if(match) jobs.set(where.key,data.value);return {count:match?1:0};};
 db.setting.update=async ({where,data})=>jobs.set(where.key,data.value);
 mocks[path.join(root,'lib/schengen-aggregate.ts')]={aggregateSchengenDaysAllDrivers:async()=>{if(failAggregation)throw Error('import test failure');}};
 mocks[path.join(root,'lib/schengen-weekly-email.ts')]={sendWeeklySchengenReportEmail:async()=>{sends++;if(failSend)throw Error('uncertain SMTP');return {sent:true};}};
 const job=load('@/lib/schengen-daily-job');
 await Promise.all([job.runDailySchengenReport(until),job.runDailySchengenReport(until)]);
 await job.runDailySchengenReport(until);
 assert.equal(sends,1); passed++; console.log('PASS concurrent/repeated daily jobs send once');
 failAggregation=true;
 const nextDate=new Date('2026-11-13T07:00:00+01:00');
 await assert.rejects(job.runDailySchengenReport(nextDate));
 assert.equal(jobs.get('schengen_daily_job:2026-11-13'),'failed');
 failAggregation=false; await job.runDailySchengenReport(nextDate);assert.equal(sends,2);
 failSend=true; const nextAgain=new Date('2026-11-14T07:00:00+01:00');
 await assert.rejects(job.runDailySchengenReport(nextAgain));await job.runDailySchengenReport(nextAgain);
 assert.equal(sends,3);assert.equal(jobs.get('schengen_daily_job:2026-11-14'),'sending');
 passed++; console.log('PASS pre-send failures retry; uncertain SMTP sends are held');
 console.log(`${passed} checks passed; no production database used.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
