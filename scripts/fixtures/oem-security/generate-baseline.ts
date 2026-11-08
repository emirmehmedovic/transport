// Synthetic compatibility fixtures captured with SheetJS 0.18.5 before upgrading.
// Do not regenerate with a new parser to make a failing regression test pass.
import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { parseOemAuditReport } from '../../../lib/oem-audit';
if (XLSX.version !== '0.18.5') throw new Error('Baseline requires original SheetJS 0.18.5');
const dir = path.resolve('scripts/fixtures/oem-security');
for (const provider of ['VOLVO', 'RIO'] as const) {
  const wb = XLSX.utils.book_new();
  const sheet = (name: string, rows: unknown[][]) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  if (provider === 'VOLVO') {
    sheet('Summary', [['Vehicle', '', 'Distance'], ['TEST-VOLVO', '', 123.5]]);
    sheet('Detalji izvještaja', [[], [], [], ['', '2026-11-01 23:50:00+01:00 - 2026-11-02 00:10:00+01:00']]);
    sheet('Putovanje', [['Synthetic report'], ['Time', 'Event', '', '', 'Distance', 'Address', 'Driver'],
      ['2026-11-01 23:50:00+01:00', 'Start', '', '', 0, 'Bosna i Hercegovina', 'Test Čović'],
      ['2026-11-01 23:55:00+01:00', 'Drive', '', '', 5, 'Hrvatska', 'Test Čović'],
      ['2026-11-02 00:05:00+01:00', 'Drive', '', '', 10, 'Hrvatska', 'Test Čović'],
      ['2026-11-02 00:10:00+01:00', 'Stop', '', '', 15, 'Bosna i Hercegovina', 'Test Čović']]);
  } else {
    sheet('RIO', [['Date', 'Time', '', 'Event', '', 'Lat', 'Lon', 'Address', 'Driver', 'Odometer', 'Distance'],
      ['1. stu 2026.', '23:50:00', '', 'Start', '', null, null, 'Bosna i Hercegovina', 'Test Šarić', '1.000,0', '0,0'],
      ['1. stu 2026.', '23:55:00', '', 'Drive', '', 45.815, 15.982, 'Hrvatska', 'Test Šarić', '1.005,5', '5,5'],
      ['2. stu 2026.', '00:05:00', '', 'Drive', '', 45.815, 15.982, 'Hrvatska', 'Test Šarić', '1.010,5', '5,0'],
      ['2. stu 2026.', '00:10:00', '', 'Stop', '', null, null, 'Bosna i Hercegovina', 'Test Šarić', '1.015,5', '5,0']]);
  }
  for (const bookType of ['xlsx', 'xls'] as const) {
    const buffer = XLSX.write(wb, { type: 'buffer', bookType });
    const name = `${provider.toLowerCase()}.${bookType}`;
    fs.writeFileSync(path.join(dir, name), buffer);
    fs.writeFileSync(path.join(dir, name + '.json'), JSON.stringify(parseOemAuditReport(buffer), null, 2) + '\n');
  }
}
console.log('Captured four synthetic old-parser fixtures');
