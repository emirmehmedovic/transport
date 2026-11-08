// Exercise rollout control flow in an isolated fake VPS. No real PM2, PostgreSQL or network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'transport-deploy-test-'));
function put(file, content, executable = false) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content, { mode: executable ? 0o755 : 0o600 }); }
function fixture(name) {
  const dir = path.join(temp, name), repo = path.join(dir, 'repo'), home = path.join(dir, 'home'), bin = path.join(dir, 'bin');
  fs.mkdirSync(repo, { recursive: true });
  fs.cpSync(path.join(root, 'scripts/deploy'), path.join(repo, 'scripts/deploy'), { recursive: true });
  fs.copyFileSync(path.join(root, 'ecosystem.config.js'), path.join(repo, 'ecosystem.config.js'));
  put(path.join(repo, '.nvmrc'), '22.23.3\n'); put(path.join(repo, '.next/BUILD_ID'), 'test-build');
  put(path.join(repo, 'package-lock.json'), '{}'); put(path.join(repo, '.env'), 'DATABASE_URL=postgresql://test:synthetic@127.0.0.1:1/test\n');
  put(path.join(home, '.nvm/nvm.sh'), 'nvm() { return 0; }\n');
  const db = path.join(dir, 'pm2.json');
  fs.writeFileSync(db, JSON.stringify(['transport-app','transport-cron'].map(name => ({name,pm2_env:{pm_cwd:repo,status:'stopped',env:{RETAINED_SETTING:'yes'}}}))));
  put(path.join(bin, 'id'), '#!/bin/bash\necho deploy\n', true);
  put(path.join(bin, 'node'), `#!/bin/bash
if [[ "$*" == *"--import tsx scripts/rebuild-schengen.ts --apply"* ]]; then
  echo apply >> "$TEST_CALLS"
  [ "$FAIL_REBUILD" != 1 ] || exit 1
  echo '{"differences":9,"applied":true}'
else
  exec "${process.execPath}" "$@"
fi
`, true);
  put(path.join(bin, 'pg_dump'), `#!/bin/bash
echo backup >> "$TEST_CALLS"
[ "$FAIL_BACKUP" != 1 ] || exit 1
for arg in "$@"; do file="$arg"; done
printf 'synthetic archive' > "$file"
`, true);
  put(path.join(bin, 'pg_restore'), '#!/bin/bash\n[ "$FAIL_ARCHIVE" != 1 ]\n', true);
  put(path.join(bin, 'curl'), '#!/bin/bash\n[ "$FAIL_HTTP" != 1 ]\n', true);
  put(path.join(bin, 'sleep'), '#!/bin/bash\nexit 0\n', true);
  put(path.join(bin, 'systemctl'), '#!/bin/bash\necho enabled\n', true);
  put(path.join(bin, 'pm2'), `#!${process.execPath}
const fs=require('fs');let list=JSON.parse(fs.readFileSync(process.env.TEST_PM2));const args=process.argv.slice(2),cmd=args[0];
fs.appendFileSync(process.env.TEST_CALLS, 'pm2 '+args.join(' ')+'\\n');
if(cmd==='jlist')console.log(JSON.stringify(list));
else if(cmd==='stop')list.forEach(p=>{if(args.includes(p.name))p.pm2_env.status='stopped';});
else if(cmd==='delete')list=list.filter(p=>!args.includes(p.name));
else if(cmd==='start'){
 const name=args[args.indexOf('--only')+1],app=require(args[1]).apps.find(a=>a.name===name);
 list.push({name,pm2_env:{pm_cwd:app.cwd,env:app.env,exec_interpreter:app.interpreter,exec_mode:app.exec_mode+'_mode',status:'online',restart_time:0}});
}
fs.writeFileSync(process.env.TEST_PM2,JSON.stringify(list));
`, true);
  return {repo,home,db,calls:path.join(dir,'calls'),env:{...process.env,HOME:home,NVM_DIR:path.join(home,'.nvm'),PATH:bin+path.delimiter+process.env.PATH,TEST_PM2:db,TEST_CALLS:path.join(dir,'calls'),TRANSPORT_ALLOW_MISSING_PROCESSES:''}};
}
function run(f, script, overrides = {}, args = []) { const r=spawnSync('bash',[`scripts/deploy/${script}.sh`, ...args],{cwd:f.repo,env:{...f.env,...overrides},encoding:'utf8'}); return {status:r.status,output:r.stdout+r.stderr}; }
const marker = f => path.join(f.home,'transport-deploy/rebuild-complete.json');
const calls = f => fs.readFileSync(f.calls,'utf8');
let passed=0;
try {
  for(const failure of ['FAIL_BACKUP','FAIL_ARCHIVE','FAIL_REBUILD']) {
    const f=fixture(failure),r=run(f,'backup-and-rebuild',{[failure]:'1'});
    assert.notEqual(r.status,0,r.output);assert.equal(fs.existsSync(marker(f)),false);
    if(failure!=='FAIL_REBUILD')assert.ok(!calls(f).includes('\napply\n'));
    assert.notEqual(run(f,'start-production').status,0);assert.ok(!calls(f).includes('pm2 delete'));
    console.log('PASS '+failure+' blocks completion and startup');passed++;
  }
  const f=fixture('success');assert.equal(run(f,'backup-and-rebuild').status,0);
  const m=JSON.parse(fs.readFileSync(marker(f)));assert.ok(fs.statSync(m.backup).size);
  const r=run(f,'start-production');assert.equal(r.status,0,r.output);
  const procs=JSON.parse(fs.readFileSync(f.db));assert.equal(procs.length,2);
  for(const p of procs){assert.equal(p.pm2_env.exec_interpreter,process.execPath);assert.equal(p.pm2_env.exec_mode,'fork_mode');assert.equal(p.pm2_env.env.RETAINED_SETTING,'yes');}
  assert.ok(calls(f).includes('pm2 save'));console.log('PASS successful backup/apply/start preserves env and pins Node/fork');passed++;
  fs.appendFileSync(path.join(f.repo,'.env'),'CHANGED=yes\n');assert.notEqual(run(f,'start-production').status,0);console.log('PASS changed configuration blocks startup');passed++;
  const reuse=fixture('reuse');assert.equal(run(reuse,'backup-and-rebuild').status,0);
  put(path.join(reuse.repo,'.next/BUILD_ID'),'new-build');
  assert.notEqual(run(reuse,'start-production').status,0);
  const reused=run(reuse,'start-production',{},['--reuse-schengen-rebuild']);
  assert.equal(reused.status,0,reused.output);
  assert.equal(calls(reuse).split('\n').filter(line=>line==='apply').length,1);
  fs.appendFileSync(path.join(reuse.repo,'.env'),'CHANGED=yes\n');
  assert.notEqual(run(reuse,'start-production',{},['--reuse-schengen-rebuild']).status,0);
  console.log('PASS explicit rebuild reuse permits a new build but still rejects changed environment');passed++;
  const absent=fixture('absent');
  assert.notEqual(run(absent,'start-production',{},['--reuse-schengen-rebuild']).status,0);
  assert.ok(!calls(absent).includes('pm2 delete'));
  console.log('PASS reuse requires an existing successful backup and apply');passed++;
  const retry=fixture('retry');assert.equal(run(retry,'backup-and-rebuild').status,0);
  assert.notEqual(run(retry,'start-production',{FAIL_HTTP:'1'}).status,0);
  assert.equal(JSON.parse(fs.readFileSync(retry.db)).some(p=>p.name==='transport-cron'),false);
  const retried=run(retry,'start-production');assert.equal(retried.status,0,retried.output);
  console.log('PASS failed HTTP check leaves cron off and startup can be retried');passed++;
  const locked=fixture('lock');fs.mkdirSync(path.join(locked.home,'transport-deploy/lock'),{recursive:true});
  assert.notEqual(run(locked,'backup-and-rebuild').status,0);assert.equal(fs.existsSync(locked.calls),false);
  console.log('PASS concurrent/stale lock blocks deployment');passed++;
  console.log(`${passed} deploy checks passed; no production services used.`);
} finally { fs.rmSync(temp,{recursive:true,force:true}); }
