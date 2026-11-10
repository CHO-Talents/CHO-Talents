// Stage public images only; storage upload and DB updates are separate operations.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { approvedImageUrl, downloadImage } from './migrate-external-product-images.mjs';

const config = await fs.readFile('config/public-config.js', 'utf8');
const key = config.match(/case 'PROD':[\s\S]*?anonKey:\s*'([^']+)'/)?.[1];
if (!key) throw new Error('운영 공개 키를 찾지 못했습니다.');
const response = await fetch('https://rabakjtjtkelpskptnvi.supabase.co/rest/v1/products?select=id,image_url,detail_image_url&order=id.asc&limit=1000', { headers: { apikey: key } });
if (!response.ok) throw new Error(`상품 조회 실패: HTTP ${response.status}`);
const products = await response.json();
const targets = products.flatMap(product => ['image_url', 'detail_image_url'].filter(field => approvedImageUrl(product[field])).map(field => ({ id: product.id, field, url: product[field] })));
const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'cho-product-images-'));
const success = [], failed = [];
for (const item of targets) {
  try {
    if (!/^[a-f0-9-]{36}$/i.test(item.id)) throw new Error('잘못된 상품 ID');
    const image = await downloadImage(item.url);
    const hash = crypto.createHash('md5').update(item.url).digest('hex');
    const kind = item.field === 'image_url' ? 'image' : 'detail';
    const filename = `migration20261110_${kind}_${item.id}_${hash}.${image.ext}`;
    await fs.writeFile(path.join(folder, filename), image.bytes, { flag: 'wx' });
    success.push({ ...item, filename, bytes: image.bytes.length });
  } catch (error) {
    failed.push({ id: item.id, field: item.field, error: error.message });
  }
}
await fs.writeFile(path.join(folder, 'manifest.json'), JSON.stringify({ success, failed }, null, 2));
console.log(JSON.stringify({ folder, candidates: targets.length, staged: success.length, failed }, null, 2));
