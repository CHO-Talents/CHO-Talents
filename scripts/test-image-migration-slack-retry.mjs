import assert from 'node:assert/strict';
import { sendSlackWebhook } from '../supabase/functions/_shared/slack-retry.mjs';
import { approvedImageUrl, detectImage, downloadImage, migrateField } from './migrate-external-product-images.mjs';

let calls = 0, waits = [];
let result = await sendSlackWebhook('https://example.test', { text:'test' }, {
  fetch: async () => ++calls === 1 ? new Response('rate limited', { status:429, headers:{ 'Retry-After':'2' } }) : new Response('ok'),
  wait: async ms => waits.push(ms)
});
assert.equal(result.response.status, 200);
assert.equal(result.retries, 1);
assert.deepEqual(waits, [2000]);

for (const response of [new Response('failed', {status:500}), new Response('slow', {status:429, headers:{'Retry-After':'11'}}), new Response('unknown delay', {status:429})]) {
  calls = 0;
  result = await sendSlackWebhook('https://example.test', {}, { fetch: async () => { calls++; return response; }, wait: async () => { throw new Error('unexpected retry'); } });
  assert.equal(calls, 1);
  assert.equal(result.retries, 0);
}
calls = 0;
await assert.rejects(sendSlackWebhook('https://example.test', {}, { fetch: async () => { calls++; throw new Error('network'); } }), /network/);
assert.equal(calls, 1);
calls = 0;
result = await sendSlackWebhook('https://example.test', {}, { fetch: async () => { calls++; return new Response('limited', {status:429, headers:{'Retry-After':'1'}}); }, wait: async () => {} });
assert.equal(calls, 3);
assert.equal(result.retries, 2);

const url = 'https://thumbnail.coupangcdn.com/example.jpg';
const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0x00]);
assert.equal(approvedImageUrl(url), true);
assert.equal(approvedImageUrl('https://thumbnail.coupangcdn.com.evil.test/a'), false);
assert.equal(approvedImageUrl('https://thumbnail.coupangcdn.com:444/a'), false);
assert.equal(approvedImageUrl('http://thumbnail.coupangcdn.com/a'), false);
assert.equal(detectImage(jpeg).type, 'image/jpeg');
assert.throws(() => detectImage(Buffer.from('<html>')), /지원하지/);
await assert.rejects(downloadImage(url, async () => new Response(null, {status:302, headers:{location:'http://127.0.0.1/'}})), /HTTP 302/);
await assert.rejects(downloadImage(url, async () => new Response('x', {headers:{'content-length': String(11 * 1024 * 1024)}})), /제한/);

let requests = [];
const fakeFetch = async (target, options = {}) => {
  requests.push({ target, options });
  if (target === url) return new Response(jpeg);
  if (target.includes('/storage/')) return new Response('{}');
  return new Response('[{"id":"abc-123"}]', {headers:{'Content-Type':'application/json'}});
};
const managed = await migrateField({ baseUrl:'https://project.test', key:'secret', legacyKey:false, product:{ id:'abc-123', image_url:url }, field:'image_url', request:fakeFetch });
assert.match(managed, /^https:\/\/project\.test\/storage\/v1\/object\/public\/Talents_Items\/talent-items\//);
assert.equal(requests.length, 3);
assert.equal(requests[0].options.redirect, 'manual');
assert.equal(requests[1].options.headers['Content-Type'], 'image/jpeg');
assert.equal(new URL(requests[2].target).searchParams.get('image_url'), `eq.${url}`);
assert.equal(JSON.parse(requests[2].options.body).image_url, managed);

requests = [];
await assert.rejects(migrateField({ baseUrl:'https://project.test', key:'secret', product:{ id:'abc-123', image_url:url }, field:'image_url', request:async (target, options) => {
  requests.push({ target, options });
  if (target === url) return new Response(jpeg);
  if (target.includes('/storage/')) return new Response('{}');
  return new Response('[]');
}}), /商品画像|상품 이미지가 변경/);
assert.equal(requests.length, 3); // No delete after an ambiguous or concurrent update.
console.log('PASS: bounded Slack retry, ambiguous failure handling, image allowlist, content limits and conditional migration');
