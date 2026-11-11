#!/usr/bin/env node
/**
 * 본다-보낸메일이-정말나갔나.mjs — **보냈다고 적힌 메일이 «정말» 나갔나.**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔴🔴 [2026-11-11 · 사장님] 「**이메일 못받았는데**」
 *
 * 보내는 자가 ✅ 보냈다 와 메시지 id 를 찍었고 대장에도 적혔다.
 * 그런데 사장님께는 안 갔다. ⇒ **「API 가 받았다」와 「사람에게 닿았다」는 다른 말이다.**
 *
 * ⛔ 메시지 id 를 보고 「갔다」고 적지 않는다. 그 id 로 **실제 메시지를 다시 읽어**
 *   받는 주소·라벨·날짜를 눈으로 본다. 라벨에 SPAM 이 있으면 스팸함에 들어간 것이다.
 *
 * ⛔ 범위는 gmail.metadata 다 — 머리글만 본다. 본문은 청하지 않는다.
 *
 * 쓰는 법
 *   node scripts/본다-보낸메일이-정말나갔나.mjs            대장 끝 다섯 통
 *   node scripts/본다-보낸메일이-정말나갔나.mjs --몇통 10
 *   node scripts/본다-보낸메일이-정말나갔나.mjs --자가시험
 */
import fs from 'node:fs';
import path from 'node:path';
import { createSign } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const 대장길 = path.join(뿌리, 'docs', '보낸메일.tsv');
export const 갈래 = 'https://www.googleapis.com/auth/gmail.metadata';

(function 환경파일읽기() {
  try {
    const 본문 = fs.readFileSync(path.join(뿌리, '.env'), 'utf8');
    for (const 줄 of 본문.split(/\r?\n/)) {
      const m = 줄.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      const 값 = m[2].trim().replace(/^["']|["']$/g, '');
      if (process.env[m[1]] === undefined) process.env[m[1]] = 값;
    }
  } catch { /* 없으면 정상 */ }
})();

/** 대장 한 줄 → {때, 보낸곳, 받는곳, 제목, id} */
export function 줄읽기(줄) {
  const 칸 = String(줄 ?? '').split('\t');
  if (칸.length < 5) return null;
  if (!/^\d{4}-\d{2}-\d{2}/.test(칸[0])) return null;
  return { 때: 칸[0], 보낸곳: 칸[1], 받는곳: 칸[2], 제목: 칸[3], id: 칸[4].trim() };
}

export function 끝에서(줄들, 몇통) {
  return (줄들 ?? []).map(줄읽기).filter(Boolean).slice(-몇통);
}

/** 라벨을 보고 어디에 떨어졌는지 가른다 */
export function 어디갔나(라벨들) {
  const L = new Set(라벨들 ?? []);
  if (L.has('SPAM')) return { 빛: '🔴', 말: '스팸함에 들어갔다' };
  if (L.has('TRASH')) return { 빛: '🔴', 말: '휴지통에 있다' };
  if (L.has('DRAFT')) return { 빛: '🔴', 말: '임시보관함에 머물렀다 — 안 나갔다' };
  if (L.has('SENT')) return { 빛: '✅', 말: '보낸편지함에 있다 — 나갔다' };
  return { 빛: '⬜', 말: '라벨로 못 가렸다 — ' + [...L].join(',') };
}

export function 키읽기() {
  const 글 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GCP_SERVICE_ACCOUNT_JSON || '';
  if (글.trim().startsWith('{')) return JSON.parse(글);
  for (const 이름 of ['service-account.json', 'gmail-service-account.json', '.gcp-sa.json']) {
    const p = path.join(뿌리, 이름);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  const 길 = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (길 && fs.existsSync(길)) return JSON.parse(fs.readFileSync(길, 'utf8'));
  return null;
}

async function 토큰받기(키, 대신할주소) {
  const 지금 = Math.floor(Date.now() / 1000);
  const h = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const b = Buffer.from(JSON.stringify({
    iss: 키.client_email, sub: 대신할주소, scope: 갈래,
    aud: 'https://oauth2.googleapis.com/token', iat: 지금, exp: 지금 + 3600,
  })).toString('base64url');
  const assertion = h + '.' + b + '.' + createSign('RSA-SHA256').update(h + '.' + b).sign(키.private_key, 'base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error_description || j.error || '토큰 오류');
  return j.access_token;
}

async function 한통읽기(토큰, 주소, id) {
  const 길 = 'https://gmail.googleapis.com/gmail/v1/users/' + encodeURIComponent(주소)
    + '/messages/' + id + '?format=metadata'
    + '&metadataHeaders=To&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date';
  const r = await fetch(길, { headers: { Authorization: 'Bearer ' + 토큰 } });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || '읽기 오류');
  return j;
}

async function 주다() {
  if (process.argv.includes('--자가시험') || process.argv.includes('--selftest')) return 자가시험();
  const i = process.argv.indexOf('--몇통');
  const 몇통 = i >= 0 ? Number(process.argv[i + 1]) || 5 : 5;

  const 줄들 = fs.readFileSync(대장길, 'utf8').split(/\r?\n/);
  const 볼것 = 끝에서(줄들, 몇통);
  console.log('■ 대장 끝 ' + 볼것.length + '통을 실제로 다시 읽는다\n');

  const 키 = 키읽기();
  if (!키) {
    console.log('⬜ 서비스 계정 열쇠를 못 찾았다 — 대장만 보여 준다');
    for (const x of 볼것) console.log('   ' + x.때 + '  ' + x.받는곳 + '  ' + x.제목.slice(0, 44));
    process.exit(2);
  }

  const 토큰통 = new Map();
  let 나쁜것 = 0;
  for (const x of 볼것) {
    try {
      if (!토큰통.has(x.보낸곳)) 토큰통.set(x.보낸곳, await 토큰받기(키, x.보낸곳));
      const j = await 한통읽기(토큰통.get(x.보낸곳), x.보낸곳, x.id);
      const 머리 = {};
      for (const h of j.payload?.headers ?? []) 머리[h.name] = h.value;
      const 어디 = 어디갔나(j.labelIds);
      if (어디.빛 !== '✅') 나쁜것 += 1;
      console.log(어디.빛 + ' ' + x.때 + '  ' + x.제목.slice(0, 40));
      console.log('     보낸곳 ' + (머리.From ?? '?'));
      console.log('     받는곳 ' + (머리.To ?? '?'));
      console.log('     날짜   ' + (머리.Date ?? '?'));
      console.log('     자리   ' + 어디.말);
    } catch (e) {
      나쁜것 += 1;
      console.log('🔴 ' + x.때 + '  ' + x.제목.slice(0, 40));
      console.log('     못 읽었다 — ' + String(e && e.message ? e.message : e).slice(0, 160));
      console.log('     ⛔ 「못 읽었다」는 「안 갔다」가 아니다. «확인하지 못했다»일 뿐이다');
    }
  }
  console.log('\n■ 성한 것 ' + (볼것.length - 나쁜것) + '/' + 볼것.length);
  process.exit(나쁜것 ? 1 : 0);
}

function 자가시험() {
  let 통 = 0; let 탈 = 0;
  const 검 = (이름, 참) => { if (참) { 통++; console.log('✅', 이름); } else { 탈++; console.log('🔴', 이름); } };

  const 줄 = '2026-11-11\tadmin@klifedesign.net\tparkintaek2@gmail.com\t제목\t1a1c';
  검('🔴 대장 한 줄을 읽는다', 줄읽기(줄)?.id === '1a1c' && 줄읽기(줄)?.받는곳.endsWith('gmail.com'));
  검('⛔ 머리줄·빈 줄은 안 읽는다', 줄읽기('날짜\t보낸곳\t받는곳\t제목\tid') === null && 줄읽기('') === null);
  검('⛔ 칸이 모자라면 안 읽는다', 줄읽기('2026-11-11\t하나\t둘') === null);
  검('🔴 끝에서 두 통을 집는다', 끝에서([줄, 줄, 줄], 2).length === 2);
  검('🔴 스팸이면 빨강', 어디갔나(['SENT', 'SPAM']).빛 === '🔴');
  검('🔴 임시보관함이면 빨강', 어디갔나(['DRAFT']).빛 === '🔴');
  검('🔴 보낸편지함이면 초록', 어디갔나(['SENT']).빛 === '✅');
  검('⛔ 모르는 라벨은 초록으로 치지 않는다', 어디갔나(['INBOX']).빛 === '⬜');
  검('⛔ 빈 것에 안 터진다', 어디갔나(null).빛 === '⬜' && 끝에서(null, 3).length === 0);
  검('⛔ 본문까지 청하는 넓은 범위를 안 쓴다', 갈래.endsWith('gmail.metadata') && !갈래.includes('readonly'));

  console.log(탈 ? '\n🔴 자가시험 ' + 탈 + '건 탈' : '\n✅ 자가시험 ' + 통 + ' 통과');
  process.exit(탈 ? 1 : 0);
}

const 나를직접돌렸나 = String(process.argv[1] ?? '').endsWith('본다-보낸메일이-정말나갔나.mjs');
if (나를직접돌렸나) await 주다();
