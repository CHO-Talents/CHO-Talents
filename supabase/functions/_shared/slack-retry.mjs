// Retry only a definitive rate-limit rejection. Network failures and 5xx responses
// may have been delivered, so retrying them can duplicate a message.
export async function sendSlackWebhook(url, payload, options = {}) {
  const request = options.fetch || fetch;
  const wait = options.wait || (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const maxRetries = options.maxRetries ?? 2;
  const maxWaitMs = options.maxWaitMs ?? 10000;
  let retries = 0;
  while (true) {
    const response = await request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (response.status !== 429 || retries >= maxRetries) return { response, retries };
    const rawDelay = response.headers.get('retry-after');
    if (!rawDelay || !/^\d+$/.test(rawDelay.trim())) return { response, retries };
    const delay = Number(rawDelay) * 1000;
    if (!Number.isSafeInteger(delay) || delay > maxWaitMs) return { response, retries };
    retries++;
    await wait(Math.max(delay, 1000));
  }
}
