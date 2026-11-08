// Compatibility checks for security updates; no network, database or real email.
import assert from 'node:assert/strict';
import { userSchema } from '../lib/validation/user';
import { truckSchema } from '../lib/validation/truck';
import { changePasswordSchema } from '../lib/validation/profile';
import { fileTypeFromBuffer } from 'file-type';
import { v4 as uuidv4, validate as validateUuid } from 'uuid';
import axios from 'axios';
import jwt from 'jsonwebtoken';

async function main() {
  const user = { email: 'test@example.invalid', password: 'test-password', firstName: 'Test', lastName: 'Driver', role: 'DRIVER', phone: '  ' };
  assert.equal(userSchema.parse(user).phone, undefined);
  assert.equal(userSchema.safeParse({ ...user, email: 'invalid' }).success, false);
  assert.equal(userSchema.safeParse({ ...user, unknownField: true }).success, false);
  assert.equal(changePasswordSchema.safeParse({ currentPassword: 'old', newPassword: 'new-password', confirmPassword: 'different' }).success, false);
  const truck = truckSchema.parse({ truckNumber: 'TEST', vin: '12345678901234567', make: 'Test', model: 'Test', year: '2020', licensePlate: 'TEST', registrationExpiry: '2027-01-01', insuranceProvider: 'Test', insurancePolicyNo: 'TEST', insuranceExpiry: '2027-01-01', currentMileage: '12000' });
  assert.equal(truck.year, 2020);
  assert.equal(truck.currentMileage, 12000);
  assert.ok(truck.registrationExpiry instanceof Date);
  console.log('PASS form validation, strict fields, coercion and password confirmation');

  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=', 'base64');
  assert.equal((await fileTypeFromBuffer(png))?.mime, 'image/png');
  assert.equal((await fileTypeFromBuffer(Buffer.from('%PDF-1.7\nsynthetic PDF signature')))?.mime, 'application/pdf');
  assert.equal(await fileTypeFromBuffer(Buffer.from('plain text, not an image')), undefined);
  assert.equal(validateUuid(uuidv4()), true);
  console.log('PASS upload MIME detection and UUID generation');

  const response = await axios.post('https://example.invalid/test', { text: 'Test čćžšđ' }, {
    adapter: async config => {
      assert.deepEqual(JSON.parse(config.data), { text: 'Test čćžšđ' });
      return { data: '{"ok":true}', status: 200, statusText: 'OK', headers: { 'content-type': 'application/json' }, config };
    },
  });
  assert.deepEqual(response.data, { ok: true });
  console.log('PASS Axios JSON request and response with offline adapter');

  const key = 'synthetic-test-key-not-a-production-secret';
  const token = jwt.sign({ userId: 'test-driver', role: 'DRIVER' }, key, { expiresIn: '5m' });
  assert.equal((jwt.verify(token, key) as jwt.JwtPayload).userId, 'test-driver');
  assert.throws(() => jwt.verify(token, 'wrong-test-key'));
  const parts = token.split('.');
  parts[1] = Buffer.from(JSON.stringify({ userId: 'test-driver', role: 'ADMIN' })).toString('base64url');
  assert.throws(() => jwt.verify(parts.join('.'), key));
  console.log('PASS authentication token signing, verification and tampering rejection');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
