const fs = require('node:fs');
const path = require('node:path');

const credentialsJson = process.env.GOOGLE_TTS_CREDENTIALS_JSON;
const credentialsPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS || '/tmp/google-tts.json';

if (!credentialsJson) {
  console.log(
    '[Google TTS] GOOGLE_TTS_CREDENTIALS_JSON is not configured. Skipping credentials file creation.',
  );
  process.exit(0);
}

try {
  const parsed = JSON.parse(credentialsJson);

  if (parsed.private_key) {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  }

  fs.mkdirSync(path.dirname(credentialsPath), { recursive: true });
  fs.writeFileSync(credentialsPath, JSON.stringify(parsed), {
    encoding: 'utf8',
    mode: 0o600,
  });

  console.log(`[Google TTS] Credentials created at ${credentialsPath}`);
} catch (error) {
  console.error(
    '[Google TTS] Invalid GOOGLE_TTS_CREDENTIALS_JSON:',
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
}