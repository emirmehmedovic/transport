// Real libraries with synthetic files and an offline mail transport. No DB or network calls.
// package.json uses scoped overrides to retain Prisma 6 and Next 15:
// - @prisma/config -> deepmerge-ts 8: config uses plain records, not the Map merging
//   behaviour changed in v8. Exercise the actual config loader below.
// - typescript-estree -> minimatch 11: exercise the parser's allowDefaultProject
//   matching below. Remove overrides when upstream ships patched dependencies.
// SheetJS 0.20.3 comes from its official CDN, as documented at
// https://docs.sheetjs.com/docs/getting-started/installation/nodejs/
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import nodemailer from 'nodemailer';
import cron from 'node-cron';
import { parseOemAuditReport } from '../lib/oem-audit';
import { sendHtmlEmail } from '../lib/email';

async function main() {
  for (const name of ['volvo.xlsx', 'volvo.xls', 'rio.xlsx', 'rio.xls']) {
    const file = path.resolve('scripts/fixtures/oem-security', name);
    const actual = parseOemAuditReport(fs.readFileSync(file));
    assert.deepEqual(JSON.parse(JSON.stringify(actual)), JSON.parse(fs.readFileSync(file + '.json', 'utf8')), name);
    assert.equal(actual.schengenDays, 2);
    assert.equal(actual.borderCrossings.length, 2);
    console.log(`PASS ${name}: complete report identical to SheetJS 0.18.5 baseline`);
  }

  const originalCreateTransport = nodemailer.createTransport;
  const savedEnv = { ...process.env };
  const messages: Record<string, any>[] = [];
  const transports: Record<string, any>[] = [];
  try {
    Object.assign(process.env, { SMTP_HOST: 'smtp.example.invalid', SMTP_USER: 'test', SMTP_PASS: 'synthetic', SMTP_PORT: '587', SMTP_SECURE: 'false', SMTP_REQUIRE_TLS: 'true', SMTP_ALLOW_SELF_SIGNED: 'false' });
    nodemailer.createTransport = ((options: Record<string, any>) => {
      transports.push(options);
      const transport = originalCreateTransport({ jsonTransport: true });
      const send = transport.sendMail.bind(transport);
      transport.sendMail = (async (mail: any) => {
        const info = await send(mail);
        messages.push(JSON.parse(info.message));
        return info;
      }) as typeof transport.sendMail;
      return transport;
    }) as typeof nodemailer.createTransport;
    await sendHtmlEmail({ to: [' first@example.invalid ', '', 'second@example.invalid'], from: 'transport@example.invalid', subject: 'Schengen čćžšđ', html: '<p>Preostalo <strong>7</strong> dana</p>', timeoutMs: 30000 });
    assert.equal(messages.length, 1);
    assert.equal(messages[0].subject, 'Schengen čćžšđ');
    assert.equal(messages[0].text, 'Preostalo 7 dana');
    assert.equal(messages[0].html, '<p>Preostalo <strong>7</strong> dana</p>');
    assert.deepEqual(messages[0].to.map((r: any) => r.address), ['first@example.invalid', 'second@example.invalid']);
    assert.equal(transports[0].requireTLS, true);
    assert.equal(transports[0].tls.rejectUnauthorized, true);
    for (const option of ['connectionTimeout', 'greetingTimeout', 'socketTimeout']) assert.equal(transports[0][option], 30000);
    Object.assign(process.env, { SMTP_PORT: '465', SMTP_SECURE: 'true', SMTP_REQUIRE_TLS: 'false' });
    await sendHtmlEmail({ to: ['test@example.invalid'], from: 'transport@example.invalid', subject: 'Test', html: '<p>HTML</p>', text: 'Explicit text' });
    assert.equal(messages[1].text, 'Explicit text');
    assert.equal(transports[1].secure, true);
    await assert.rejects(sendHtmlEmail({ to: [' '], subject: 'Test', html: 'Test' }), /primalaca/);
    nodemailer.createTransport = (() => ({ sendMail: async () => { throw new Error('synthetic SMTP failure'); } })) as unknown as typeof nodemailer.createTransport;
    await assert.rejects(sendHtmlEmail({ to: ['test@example.invalid'], subject: 'Test', html: 'Test' }), /synthetic SMTP failure/);
    console.log('PASS Nodemailer: recipients, UTF-8, HTML/text, TLS, timeouts and error propagation; no real mail');
  } finally {
    nodemailer.createTransport = originalCreateTransport;
    for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
    Object.assign(process.env, savedEnv);
  }

  const RealDate = Date;
  for (const [now, nextSeven] of [
    ['2026-11-08T05:59:00Z', '2026-11-08T06:00:00.000Z'],
    ['2026-07-08T04:59:00Z', '2026-07-08T05:00:00.000Z'],
    ['2026-03-29T00:59:00Z', '2026-03-29T05:00:00.000Z'],
    ['2026-10-25T00:59:00Z', '2026-10-25T06:00:00.000Z'],
  ]) {
    const fixed = new RealDate(now).getTime();
    class FixedDate extends RealDate {
      constructor(value?: string | number | Date) { super(value === undefined ? fixed : value as string); }
      static now() { return fixed; }
    }
    global.Date = FixedDate as DateConstructor;
    let calls = 0;
    const task = cron.schedule('0,15,30 7 * * *', () => { calls++; }, { timezone: 'Europe/Sarajevo' });
    try { assert.equal(task.getNextRun()?.toISOString(), nextSeven); assert.equal(calls, 0); }
    finally { await task.destroy(); global.Date = RealDate; }
  }
  const cronSource = fs.readFileSync('scripts/cron-runner.ts', 'utf8');
  const expressions = [...cronSource.matchAll(/cron\.schedule\("([^"]+)"/g)].map(match => match[1]);
  assert.equal(expressions.length, 7);
  for (const expression of expressions) assert.ok(cron.validate(expression), expression);
  for (const [now, expected] of [
    ['2026-11-07T23:00:01Z', ['2026-11-08T06:05:00.000Z', '2026-11-08T23:00:00.000Z', '2026-11-08T05:30:00.000Z', '2026-11-08T06:00:00.000Z', '2026-11-07T23:40:00.000Z', '2026-11-08T03:30:00.000Z', '2026-11-07T23:05:00.000Z']],
    ['2026-07-07T22:00:01Z', ['2026-07-08T05:05:00.000Z', '2026-07-08T22:00:00.000Z', '2026-07-08T04:30:00.000Z', '2026-07-08T05:00:00.000Z', '2026-07-07T22:40:00.000Z', '2026-07-08T02:30:00.000Z', '2026-07-07T22:05:00.000Z']],
  ] as const) {
    const fixed = new RealDate(now).getTime();
    class FixedDate extends RealDate {
      constructor(value?: string | number | Date) { super(value === undefined ? fixed : value as string); }
      static now() { return fixed; }
    }
    global.Date = FixedDate as DateConstructor;
    try {
      for (const [index, expression] of expressions.entries()) {
        const task = cron.schedule(expression, () => { throw new Error('Unexpected cron execution'); }, { timezone: 'Europe/Sarajevo' });
        try { assert.equal(task.getNextRun()?.toISOString(), expected[index], expression); }
        finally { await task.destroy(); }
      }
    } finally { global.Date = RealDate; }
  }
  console.log('PASS cron: all seven schedules in winter/summer, daily report on DST transition days; no immediate execution');

  const require = createRequire(import.meta.url);
  const configLoader = require('@prisma/config');
  const oldUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/compatibility';
  try {
    const result = await configLoader.loadConfigFromFile({ configRoot: process.cwd() });
    assert.equal(result.error, undefined);
    assert.equal(result.config.datasource.url, process.env.DATABASE_URL);
    assert.equal(result.config.schema, path.resolve('prisma/schema.prisma'));
    assert.equal(result.config.migrations.path, path.resolve('prisma/migrations'));
    console.log('PASS Prisma: real configuration loader with patched deepmerge; no DB connection');
  } finally { if (oldUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = oldUrl; }

  const parser = require('@typescript-eslint/parser');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'transport-eslint-compat-'));
  try {
    fs.mkdirSync(path.join(dir, 'src'));
    fs.writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true }, include: ['src/**/*.ts'] }));
    fs.writeFileSync(path.join(dir, 'src/main.ts'), 'export const main = 1;');
    const code = 'const count: number = 1;';
    const filePath = path.join(dir, 'compat.ts');
    fs.writeFileSync(filePath, code);
    const parsed = parser.parseForESLint(code, { filePath, tsconfigRootDir: dir, projectService: { allowDefaultProject: ['*.ts'] } });
    assert.ok(parsed.services.program);
    assert.equal(parsed.ast.body.length, 1);
    console.log('PASS TypeScript ESLint project-service glob matching with patched minimatch');
  } finally { parser.clearCaches?.(); fs.rmSync(dir, { recursive: true, force: true }); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
