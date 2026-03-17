import WebSocket from 'ws';

const CLOSE_CODE = 4006;
const PORT = 3001;

console.log(`--- Testing Force Close Code ${CLOSE_CODE} ---`);

const ws = new WebSocket(`ws://localhost:${PORT}/ws`, ['lume', 'auth.fake-token']);

ws.on('open', () => {
  console.log('Connected (Unexpected! Should have been closed)');
  setTimeout(() => {
    console.log('FAIL: Connection remained open.');
    process.exit(1);
  }, 2000);
});

ws.on('close', (code: number, reason: Buffer) => {
  console.log(`Connection closed. Code: ${code}, Reason: ${reason.toString()}`);
  if (code === CLOSE_CODE) {
    console.log('SUCCESS: Server closed connection with expected code.');
    process.exit(0);
  } else {
    console.log(`FAIL: Expected ${CLOSE_CODE}, got ${code}`);
    process.exit(1);
  }
});

ws.on('error', () => {
  // Sometimes close fires via error first depending on timing
});
