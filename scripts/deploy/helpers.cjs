// Production rollout helpers. Never print database URLs, credentials or PM2 environments.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = process.cwd();
const run = process.env.TRANSPORT_DEPLOY_RUN;
const state = process.env.TRANSPORT_DEPLOY_STATE;
const names = ['transport-app', 'transport-cron'];
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const write = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
const fingerprint = () => ({ root, node: process.version, build: fs.readFileSync('.next/BUILD_ID', 'utf8').trim(), lock: hash('package-lock.json'), env: hash('.env') });
function checkProcesses(file) {
  const list = read(file);
  if (!Array.isArray(list)) throw Error('Neispravan PM2 popis.');
  for (const name of names) {
    const found = list.filter(p => p.name === name);
    if (found.length === 0 && process.env.TRANSPORT_ALLOW_MISSING_PROCESSES === '1') continue;
    if (found.length !== 1) throw Error(`Očekujem tačno jedan ${name}; pronađeno ${found.length}. Provjeri pm2 list.`);
    if (fs.realpathSync(found[0].pm2_env.pm_cwd) !== fs.realpathSync(root)) throw Error(`Pogrešan radni direktorij za ${name}.`);
  }
  return list;
}
function command(bin, args, options = {}) {
  const result = spawnSync(bin, args, { stdio: 'inherit', ...options });
  if (result.error || result.status !== 0) throw Error(`${bin} nije uspio; kod ${result.status ?? result.error?.code}.`);
}
async function main() {
  switch (process.argv[2]) {
    case 'validate-processes':
      checkProcesses(path.join(run, 'pm2-before.json'));
      break;
    case 'backup': {
      const before = checkProcesses(path.join(run, 'pm2-before.json'));
      for (const item of before.filter(item => names.includes(item.name))) {
        const configured = item.pm2_env.env?.DATABASE_URL || item.pm2_env.DATABASE_URL;
        if (configured && configured !== process.env.DATABASE_URL) throw Error('PM2 i .env koriste različit DATABASE_URL. Provjeri konfiguraciju prije backupa.');
      }
      const u = new URL(process.env.DATABASE_URL);
      if (!['postgres:', 'postgresql:'].includes(u.protocol)) throw Error('DATABASE_URL nije PostgreSQL URL.');
      const env = { ...process.env, PGHOST: u.hostname, PGPORT: u.port || '5432', PGDATABASE: decodeURIComponent(u.pathname.slice(1)), PGUSER: decodeURIComponent(u.username), PGPASSWORD: decodeURIComponent(u.password) };
      for (const [query, key] of Object.entries({ sslmode: 'PGSSLMODE', sslcert: 'PGSSLCERT', sslkey: 'PGSSLKEY', sslrootcert: 'PGSSLROOTCERT', connect_timeout: 'PGCONNECT_TIMEOUT' })) {
        if (u.searchParams.has(query)) env[key] = u.searchParams.get(query);
      }
      const file = path.join(run, 'database-before.dump');
      console.log('Pravim backup baze...');
      command('pg_dump', ['--no-password', '--format=custom', '--file', file], { env });
      if (fs.statSync(file).size === 0) throw Error('Backup je prazan.');
      command('pg_restore', ['--list', file], { stdio: ['ignore', 'ignore', 'inherit'] });
      write(path.join(run, 'backup-verified.json'), { file, ...fingerprint() });
      console.log(`Backup sačuvan; sadržaj arhive je čitljiv: ${file}`);
      break;
    }
    case 'complete': {
      const backup = read(path.join(run, 'backup-verified.json'));
      const lines = fs.readFileSync(path.join(run, 'schengen-apply.jsonl'), 'utf8').trim().split('\n');
      const final = JSON.parse(lines.at(-1));
      if (final.applied !== true || !Number.isFinite(final.differences)) throw Error('Nema završne potvrde preračuna. Procesi ostaju zaustavljeni.');
      const marker = path.join(state, 'rebuild-complete.json');
      write(marker + '.tmp', { ...fingerprint(), backup: backup.file, completedAt: new Date().toISOString(), differences: final.differences });
      fs.renameSync(marker + '.tmp', marker);
      break;
    }
    case 'prepare-start': {
      const marker = read(path.join(state, 'rebuild-complete.json'));
      for (const [key, value] of Object.entries(fingerprint())) {
        if (key === 'build' && marker[key] !== value && process.argv[3] === '--reuse-schengen-rebuild') {
          console.log('Novi build: koristim prethodno uspješno završen Schengen preračun.');
          continue;
        }
        if (marker[key] !== value) throw Error(`Stanje nakon preračuna se promijenilo (${key}); pregledaj prije pokretanja.`);
      }
      if (!fs.statSync(marker.backup).size) throw Error('Nedostaje backup.');
      const before = checkProcesses(path.join(run, 'pm2-before.json'));
      const config = require(path.join(root, 'ecosystem.config.js'));
      config.apps = names.map(name => {
        const base = config.apps.find(app => app.name === name);
        if (!base) throw Error(`Nedostaje konfiguracija ${name}.`);
        const savedConfig = path.join(state, 'runtime.config.js');
        const savedEnv = fs.existsSync(savedConfig) ? require(savedConfig).apps.find(app => app.name === name)?.env : {};
        const previous = before.find(p => p.name === name)?.pm2_env || { env: savedEnv };
        return { ...base, cwd: root, script: fs.realpathSync(path.join(path.dirname(process.execPath), 'npm')), interpreter: process.execPath, instances: 1, exec_mode: 'fork', env: { ...(previous.env || {}), ...base.env, PATH: process.env.PATH, NODE_ENV: 'production' } };
      });
      fs.writeFileSync(path.join(run, 'runtime.config.js'), 'module.exports = ' + JSON.stringify(config, null, 2) + ';\n', { mode: 0o600 });
      fs.copyFileSync(path.join(run, 'runtime.config.js'), path.join(state, 'runtime.config.js'));
      break;
    }
    case 'existing-processes':
      for (const p of checkProcesses(path.join(run, 'pm2-before.json'))) if (names.includes(p.name)) console.log(p.name);
      break;
    case 'verify-start': {
      const list = checkProcesses(path.join(run, 'pm2-after.json'));
      for (const name of names) {
        const p = list.find(item => item.name === name).pm2_env;
        if (p.status !== 'online' || p.exec_interpreter !== process.execPath || p.exec_mode !== 'fork_mode' || p.restart_time > 0) throw Error(`${name} nije stabilan s novim Nodeom. Provjeri PM2 logove.`);
      }
      console.log('Oba procesa su online, bez restarta, u fork režimu s ispravnim Nodeom.');
      break;
    }
    default: throw Error('Nepoznata deploy naredba.');
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
