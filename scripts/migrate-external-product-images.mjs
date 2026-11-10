#!/usr/bin/env node
// Read-only by default. --apply migrates approved external product images.
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const allowedHosts = new Set(['thumbnail.coupangcdn.com', 'image.coupangcdn.com', 'gi.esmplus.com', 'shop-phinf.pstatic.net']);
const maxBytes = 10 * 1024 * 1024;

export function approvedImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && allowedHosts.has(url.hostname.toLowerCase());
  } catch { return false; }
}

export function detectImage(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { type: 'image/jpeg', ext: 'jpg' };
  if (bytes.length >= 8 && Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return { type: 'image/png', ext: 'png' };
  if (bytes.length >= 6 && ['GIF87a', 'GIF89a'].includes(Buffer.from(bytes.subarray(0, 6)).toString('ascii'))) return { type: 'image/gif', ext: 'gif' };
  if (bytes.length >= 12 && Buffer.from(bytes.subarray(0, 4)).toString('ascii') === 'RIFF' && Buffer.from(bytes.subarray(8, 12)).toString('ascii') === 'WEBP') return { type: 'image/webp', ext: 'webp' };
  throw new Error('지원하지 않는 이미지 또는 잘못된 이미지 응답');
}

export async function downloadImage(url, request = fetch) {
  if (!approvedImageUrl(url)) throw new Error('허용되지 않은 이미지 주소');
  const res = await request(url, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`이미지 응답 HTTP ${res.status}`);
  const length = Number(res.headers.get('content-length') || 0);
  if (length > maxBytes) throw new Error('이미지 크기 제한 초과');
  if (!res.body) throw new Error('이미지 본문 없음');
  const reader = res.body.getReader(), chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel(); throw new Error('이미지 크기 제한 초과'); }
    chunks.push(value);
  }
  const bytes = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
  return { bytes, ...detectImage(bytes) };
}

function loadEnv() {
  const values = {};
  if (fs.existsSync('.env.local')) {
    for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (match) values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  return { ...values, ...process.env };
}

export async function migrateField({ baseUrl, key, legacyKey, product, field, request = fetch }) {
  const original = product[field];
  const image = await downloadImage(original, request);
  if (!/^[a-z0-9-]+$/i.test(String(product.id))) throw new Error('올바르지 않은 상품 ID');
  const path = `talent-items/talent_item_${product.id}_import_${randomUUID()}.${image.ext}`;
  const headers = { apikey: key, ...(legacyKey ? { Authorization: `Bearer ${key}` } : {}) };
  const upload = await request(`${baseUrl}/storage/v1/object/Talents_Items/${path}`, {
    method: 'POST', headers: { ...headers, 'Content-Type': image.type, 'x-upsert': 'false', 'Cache-Control': 'max-age=3600' }, body: image.bytes
  });
  if (!upload.ok) throw new Error(`저장소 업로드 실패 HTTP ${upload.status}`);
  const managedUrl = `${baseUrl}/storage/v1/object/public/Talents_Items/${path}`;
  const filters = new URLSearchParams({ id: `eq.${product.id}`, [field]: `eq.${original}` });
  // Compare-and-set prevents overwriting a concurrent administrator edit.
  let update;
  try {
    update = await request(`${baseUrl}/rest/v1/products?${filters}`, {
      method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ [field]: managedUrl })
    });
    if (!update.ok) throw new Error(`상품 갱신 실패 HTTP ${update.status}`);
    const rows = await update.json();
    if (rows.length !== 1) throw new Error('상품 이미지가 변경되어 갱신 생략');
  } catch (err) {
    // The update outcome may be ambiguous: never delete a possibly referenced file.
    throw new Error(`${err.message}; 저장소 파일 확인 필요: ${path}`);
  }
  return managedUrl;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !['--check', '--apply'].includes(args[0])) throw new Error('사용법: node scripts/migrate-external-product-images.mjs --check | --apply');
  const apply = args[0] === '--apply', env = loadEnv();
  const baseUrl = 'https://rabakjtjtkelpskptnvi.supabase.co';
  const config = fs.readFileSync('config/public-config.js', 'utf8');
  const publicKey = config.match(/case 'PROD':[\s\S]*?anonKey:\s*'([^']+)'/)?.[1];
  const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || (!apply && publicKey);
  if (!key) throw new Error('적용에는 .env.local의 SUPABASE_SECRET_KEY 또는 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.');
  if (env.SUPABASE_URL && env.SUPABASE_URL.replace(/\/$/, '') !== baseUrl) throw new Error('SUPABASE_URL이 운영 프로젝트와 일치하지 않습니다.');
  const headers = { apikey: key, ...(!env.SUPABASE_SECRET_KEY && env.SUPABASE_SERVICE_ROLE_KEY ? { Authorization: `Bearer ${key}` } : {}) };
  const products = [];
  for (let offset = 0;; offset += 500) {
    const res = await fetch(`${baseUrl}/rest/v1/products?select=id,image_url,detail_image_url,is_active&order=id.asc&limit=500&offset=${offset}`, { headers });
    if (!res.ok) throw new Error(`상품 조회 실패 HTTP ${res.status}`);
    const page = await res.json(); products.push(...page);
    if (page.length < 500) break;
  }
  const candidates = products.flatMap(product => ['image_url', 'detail_image_url'].filter(field => approvedImageUrl(product[field])).map(field => ({ product, field })));
  const otherExternal = products.flatMap(product => ['image_url', 'detail_image_url'].map(field => product[field])).filter(value => {
    try { return value && new URL(value).hostname !== new URL(baseUrl).hostname && !approvedImageUrl(value); } catch { return !!value; }
  }).length;
  console.log(`모드: ${apply ? '적용' : '조회'}; 조회 상품: ${products.length}; 이전 대상 이미지: ${candidates.length}; 허용되지 않은 외부 주소: ${otherExternal}`);
  if (!apply) { if (!env.SUPABASE_SECRET_KEY && !env.SUPABASE_SERVICE_ROLE_KEY) console.log('공개 권한으로 보이는 상품만 집계했습니다.'); return; }
  let success = 0, failed = 0;
  for (const candidate of candidates) {
    try {
      await migrateField({ baseUrl, key, legacyKey: !env.SUPABASE_SECRET_KEY, ...candidate });
      success++;
    } catch (err) {
      failed++;
      console.error(`이전 실패 (상품 ID ${candidate.product.id}, ${candidate.field}): ${err.message}`);
    }
  }
  console.log(`이전 완료: ${success}; 실패: ${failed}`);
  if (failed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(err => { console.error(err.message); process.exitCode = 1; });
