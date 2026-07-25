const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const supportScreenSource = readFileSync(
  join(__dirname, '..', 'src', 'app', '(app)', 'support.tsx'),
  'utf8'
);

test('suporte usa o cliente HTTP central e não fixa a API beta', () => {
  assert.match(supportScreenSource, /api\.post<SupportResponse>\('\/support'/);
  assert.doesNotMatch(
    supportScreenSource,
    /sentinela-backend-beta\.onrender\.com/
  );
  assert.doesNotMatch(supportScreenSource, /SUPPORT_URL/);
});
