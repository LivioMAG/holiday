import test from 'node:test';
import assert from 'node:assert/strict';
import { registerUser } from '../src/services/auth-service.js';

test('registers with profile metadata and skips profile upsert until a session exists', async () => {
  const originalWindow = globalThis.window;
  let signUpPayload;
  let profileWrites = 0;

  globalThis.window = {
    supabaseClient: {
      auth: {
        async signUp(payload) {
          signUpPayload = payload;
          return { data: { user: { id: 'user-1', email: payload.email }, session: null }, error: null };
        },
      },
      from() {
        profileWrites += 1;
        return {};
      },
    },
  };

  const data = await registerUser({ firstName: ' Ada ', lastName: ' Lovelace ', email: ' ADA@EXAMPLE.COM ', password: 'password123' });

  assert.equal(data.user.id, 'user-1');
  assert.equal(signUpPayload.email, 'ada@example.com');
  assert.deepEqual(signUpPayload.options.data, {
    firstName: 'Ada',
    lastName: 'Lovelace',
    first_name: 'Ada',
    last_name: 'Lovelace',
  });
  assert.equal(profileWrites, 0);

  globalThis.window = originalWindow;
});
