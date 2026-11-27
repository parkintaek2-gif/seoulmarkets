#!/usr/bin/env node
/**
 * jb-excel-fill.mjs — 사장님이 주신 엑셀(기자별 월별 기사생산량-2026)의 「보도자료」 빈 칸을 채우고
 *   「일반」 줄의 서식을 맞춘다. 원본 파일에서 시트 한 장의 XML 만 갈아 끼운다(나머지 부분은 바이트 그대로).
 *
 * 사장님 2026-11-27 —
 *   「보도자료 한 개로만 분류한 뒤 첨부한 엑셀에서 비워진 내용을 채워서 줘」
 *   (1) 일반 = 보도자료 외 기사, 전체 = 보도자료로 분류된 기사 + 일반
 *   (2) 일반 중 70을 초과하는 셀의 숫자는 빨강색   (3) 일반의 셀 바탕색은 첨부파일처럼 노랑색
 *   「월 전체기사량이70건이 넘는 데만 검색해서 작업하도록 해...70건 이하는 하지 말고」
 *
 * ⛔ 이미 숫자가 든 보도자료 칸은 바꾸지 않는다. 검색 건수와 다르면 「다름」 목록에만 적는다.
 * ⛔ 검색하지 않은 기자·달(전체 70건 이하)의 보도자료 칸은 비워 둔다 — 재지 않은 칸에 숫자를 넣지 않는다.
 * 일반 칸의 수식(=전체-보도자료)은 그대로 두고, 저장된 계산값과 서식(노랑 바탕, 70 초과는 빨강 글자)만 고친다.
 * 원본에 이미 있는 서식을 쓴다: 25번(노랑 바탕·검정) · 27번(노랑 바탕·빨강).
 *
 *   node scripts/jb-excel-fill.mjs <원본.xlsx> <훑은 json> <낼 xlsx> <낼 기록 json>
 */
import fs from 'node:fs';
import zlib from 'node:zlib';

const [원본, 훑은곳, 낼곳, 기록곳] = process.argv.slice(2);
const 통 = fs.readFileSync(원본);

/* ── ZIP: 중앙 목록을 읽어 항목마다 «눌린 바이트 그대로» 들고 있는다 ── */
const 끝 = 통.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
const 개수 = 통.readUInt16LE(끝 + 10);
let p = 통.readUInt32LE(끝 + 16);
const 항목 = [];
for (let i = 0; i < 개수; i += 1) {
  if (통.readUInt32LE(p) !== 0x02014b50) throw new Error('중앙 항목 머리가 틀렸다');
  const 이름길이 = 통.readUInt16LE(p + 28); const 덤길이 = 통.readUInt16LE(p + 30); const 말길이 = 통.readUInt16LE(p + 32);
  const 자리 = 통.readUInt32LE(p + 42);
  const e = { 깃발: 통.readUInt16LE(p + 8), 방법: 통.readUInt16LE(p + 10), 시각: 통.readUInt16LE(p + 12), 날: 통.readUInt16LE(p + 14),
    crc: 통.readUInt32LE(p + 16), 눌린크기: 통.readUInt32LE(p + 20), 날것크기: 통.readUInt32LE(p + 24),
    이름: 통.subarray(p + 46, p + 46 + 이름길이), 바깥속성: 통.readUInt32LE(p + 38) };
  const 지역이름 = 통.readUInt16LE(자리 + 26); const 지역덤 = 통.readUInt16LE(자리 + 28);
  e.자료 = 통.subarray(자리 + 30 + 지역이름 + 지역덤, 자리 + 30 + 지역이름 + 지역덤 + e.눌린크기);
  항목.push(e);
  p += 46 + 이름길이 + 덤길이 + 말길이;
}
const 찾기 = (이름) => 항목.find((e) => e.이름.toString('utf8') === 이름);
const 글읽기 = (e) => (e.방법 === 0 ? e.자료 : zlib.inflateRawSync(e.자료)).toString('utf8');
const 글넣기 = (e, 글) => { const 날것 = Buffer.from(글, 'utf8'); e.자료 = zlib.deflateRawSync(날것); e.방법 = 8; e.crc = zlib.crc32(날것) >>> 0; e.눌린크기 = e.자료.length; e.날것크기 = 날것.length; e.깃발 &= ~0x08; };
function 묶는다() {
  const 앞 = []; const 가운데 = []; let 자리 = 0;
  for (const e of 항목) {
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(e.깃발 & ~0x08, 6); h.writeUInt16LE(e.방법, 8);
    h.writeUInt16LE(e.시각, 10); h.writeUInt16LE(e.날, 12); h.writeUInt32LE(e.crc, 14); h.writeUInt32LE(e.눌린크기, 18); h.writeUInt32LE(e.날것크기, 22);
    h.writeUInt16LE(e.이름.length, 26); h.writeUInt16LE(0, 28);
    앞.push(h, e.이름, e.자료);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(e.깃발 & ~0x08, 8); c.writeUInt16LE(e.방법, 10);
    c.writeUInt16LE(e.시각, 12); c.writeUInt16LE(e.날, 14); c.writeUInt32LE(e.crc, 16); c.writeUInt32LE(e.눌린크기, 20); c.writeUInt32LE(e.날것크기, 24);
    c.writeUInt16LE(e.이름.length, 28); c.writeUInt32LE(e.바깥속성, 38); c.writeUInt32LE(자리, 42);
    가운데.push(c, e.이름);
    자리 += 30 + e.이름.length + e.자료.length;
  }
  const 가운데통 = Buffer.concat(가운데);
  const 꼬리 = Buffer.alloc(22);
  꼬리.writeUInt32LE(0x06054b50, 0); 꼬리.writeUInt16LE(항목.length, 8); 꼬리.writeUInt16LE(항목.length, 10);
  꼬리.writeUInt32LE(가운데통.length, 12); 꼬리.writeUInt32LE(자리, 16);
  return Buffer.concat([...앞, 가운데통, 꼬리]);
}

/* ── 시트 읽기 ── */
const 풀기 = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const 글들 = [...글읽기(찾기('xl/sharedStrings.xml')).matchAll(/<si>([\s\S]*?)<\/si>/g)]
  .map((m) => 풀기([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
const 시트항목 = 찾기('xl/worksheets/sheet1.xml');
let 시트 = 글읽기(시트항목);
const 칸찾는식 = (자리) => new RegExp('<c r="' + 자리 + '"([^>]*?)(/>|>([\\s\\S]*?)</c>)');
const 칸읽기 = (자리) => {
  const m = 시트.match(칸찾는식(자리));
  if (!m) return { 있나: false };
  const 꼴 = (m[1].match(/t="(\w+)"/) || [])[1]; const 서식 = (m[1].match(/s="(\d+)"/) || [])[1];
  const v = m[3] ? (m[3].match(/<v>([\s\S]*?)<\/v>/) || [])[1] : undefined;
  const 수식 = m[3] ? (m[3].match(/<f[^>]*>[\s\S]*?<\/f>|<f[^>]*\/>/) || [])[0] : undefined;
  return { 있나: true, 원문: m[0], 서식, 꼴, 수식, 값: v === undefined ? null : (꼴 === 's' ? 글들[Number(v)] : v) };
};
const 칸쓰기 = (자리, { 서식, 수식, 값 }) => {
  const 옛 = 칸읽기(자리);
  if (!옛.있나) throw new Error('칸이 없다 ' + 자리);
  const 새 = '<c r="' + 자리 + '"' + (서식 !== undefined && 서식 !== null ? ' s="' + 서식 + '"' : '') + '>' + (수식 || '') + (값 === null || 값 === undefined ? '' : '<v>' + 값 + '</v>') + '</c>';
  시트 = 시트.replace(옛.원문, 새);
};

/* ── 훑은 건수: 기자·달 → 보도자료 검색 건수 ── */
const 훑음 = JSON.parse(fs.readFileSync(훑은곳, 'utf8'));
const 건수표 = new Map();
for (const x of 훑음) if (!x.탈 && x.건수표기 !== null) 건수표.set(x.기자 + ' ' + x.달, x.건수표기);

const 달열 = { D: '01', E: '02', F: '03', G: '04', H: '05', I: '06', J: '07', K: '08', L: '09', M: '10', P: '11' };
const 서식열 = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'P'];
const 기록 = { 채운칸: [], 그대로둔칸: [], 다름: [], 비워둔칸수: 0, 빨강칸: [], 일반줄수: 0, 전체바꾼칸: [], 음수칸: [] };
/* --stat <폴더>: kija_2026MM.tsv (순위·기자명·기사수·승인…) 를 읽어 달 → 기자 → 승인 건수 표를 만든다 */
const 통계자리 = process.argv.indexOf('--stat');
let 통계표 = null;
if (통계자리 > 0) {
  통계표 = {};
  for (const 달 of Object.values(달열)) {
    통계표[달] = {};
    for (const 줄 of fs.readFileSync(process.argv[통계자리 + 1] + '/kija_2026' + 달 + '.tsv', 'utf8').split('\n')) {
      const 칸 = 줄.split('\t');
      if (/^\d+$/.test(칸[0]) && 칸[3] !== undefined) 통계표[달][칸[1].trim()] = Number(칸[3].replace(/,/g, ''));
    }
  }
}
const 줄번호들 = [...시트.matchAll(/<row [^>]*r="(\d+)"/g)].map((m) => Number(m[1]));
for (const 번 of 줄번호들) {
  if (칸읽기('C' + 번).값 !== '전체') continue;
  const 기자 = String(칸읽기('B' + 번).값 || '').trim();
  if (!기자) continue;
  if (칸읽기('C' + (번 + 1)).값 !== '보도자료' || 칸읽기('C' + (번 + 2)).값 !== '일반') throw new Error(기자 + ' 줄 짜임이 다르다 (' + 번 + ')');
  기록.일반줄수 += 1;
  for (const 열 of 서식열) {
    const 전체 = 칸읽기(열 + 번); const 보도 = 칸읽기(열 + (번 + 1)); const 일반 = 칸읽기(열 + (번 + 2));
    const 달 = 달열[열];
    let 보도값 = 보도.값 === null || 보도.값 === '' ? null : Number(보도.값);
    if (달) {
      const 잰 = 건수표.get(기자 + ' 2026-' + 달);
      if (잰 !== undefined) {
        if (보도값 === null) { 칸쓰기(열 + (번 + 1), { 서식: 보도.서식, 값: 잰 }); 기록.채운칸.push({ 기자, 달: 달 + '월', 값: 잰 }); 보도값 = 잰; }
        else if (보도값 !== 잰) {
          기록.다름.push({ 기자, 달: 달 + '월', 엑셀: 보도값, 검색: 잰 });
          /* 사장님 2026-11-27 「이건 검색값에 맞춰」 — --match 를 주면 다른 칸을 검색 값으로 바꾼다 */
          if (process.argv.includes('--match')) { 칸쓰기(열 + (번 + 1), { 서식: 보도.서식, 값: 잰 }); 보도값 = 잰; }
        }
        else 기록.그대로둔칸.push({ 기자, 달: 달 + '월', 값: 보도값 });
      } else if (보도값 === null) 기록.비워둔칸수 += 1;
    }
    if (!일반.있나) continue;
    let 전체값 = 전체.값 === null || 전체.값 === '' ? null : Number(전체.값);
    /* 사장님 2026-11-27 「음수가 된 부분을 포함해 … 데이터를 채워 넣어」 — --stat <폴더> 를 주면
       「전체」를 CMS 기자별통계(기준=승인) 값으로 적는다. 통계에 이름이 없는 기자·달은 그대로 둔다 */
    if (달 && 통계표 && 통계표[달] && 통계표[달][기자] !== undefined && 전체.있나) {
      const 통계값 = 통계표[달][기자];
      if (전체값 !== 통계값) {
        기록.전체바꾼칸.push({ 기자, 달: 달 + '월', 엑셀: 전체값, 통계: 통계값 });
        /* 원본에서 수식(=121 같은 꼴)이던 칸은 수식으로 남긴다 — 계산 순서 목록(calcChain)과 어긋나지 않게 */
        칸쓰기(열 + 번, { 서식: 전체.서식, 수식: 전체.수식 ? '<f>' + 통계값 + '</f>' : undefined, 값: 통계값 });
        전체값 = 통계값;
      }
    }
    /* 일반 = 전체 − 보도자료. 전체가 비어 있으면 계산값을 적지 않는다 */
    const 일반값 = 전체값 === null ? null : 전체값 - (보도값 ?? 0);
    const 빨강 = 일반값 !== null && 일반값 > 70;
    if (빨강) 기록.빨강칸.push({ 기자, 열, 값: 일반값 });
    칸쓰기(열 + (번 + 2), { 서식: 빨강 ? 27 : 25, 수식: 일반.수식, 값: 일반.수식 ? 일반값 : (일반.값 === null ? null : 일반.값) });
  }
  /* 1~10월 「전체」가 바뀐 줄은 합(O)·월평균(Q)·최대달(R)의 저장된 계산값도 맞춘다 — 수식은 그대로 둔다.
     휴대폰 미리보기는 수식을 다시 계산하지 않고 저장된 값을 보여 주기 때문이다. 원본 수식이 표준 꼴일 때만 한다 */
  if (기록.전체바꾼칸.some((x) => x.기자 === 기자 && x.달 !== '11월')) {
    const 값들 = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'].map((열) => Number(칸읽기(열 + 번).값 || 0));
    const 합 = 값들.reduce((a, b) => a + b, 0);
    for (const [열, 새값, 꼴] of [['O', 합, /SUM\(D\d+:M\d+\)|t="shared"/], ['Q', 합 / 10, /AVERAGE\(D\d+:M\d+\)|t="shared"/], ['R', Math.max(...값들), /MAX\(D\d+:M\d+\)|t="shared"/]]) {
      const 칸 = 칸읽기(열 + 번);
      if (칸.있나 && 칸.수식 && 꼴.test(칸.수식)) 칸쓰기(열 + 번, { 서식: 칸.서식, 수식: 칸.수식, 값: 새값 });
    }
  }
}
/* 머리 두 줄과 왼쪽 세 열 고정은 원본에 이미 있다. 열었을 때 맨 위부터 보이게 보이는 자리만 처음으로 돌린다 */
시트 = 시트.replace(/(<pane [^>]*topLeftCell=")[A-Z]+\d+(")/, '$1D3$2');
글넣기(시트항목, 시트);
/* 열 때 엑셀이 수식을 다시 계산하게 한다 — 저장된 계산값과 어긋나는 자리가 남지 않게 */
const 책항목 = 찾기('xl/workbook.xml'); let 책 = 글읽기(책항목);
if (/<calcPr[^>]*\/>/.test(책)) { if (!/fullCalcOnLoad/.test(책)) 책 = 책.replace(/<calcPr([^>]*)\/>/, '<calcPr$1 fullCalcOnLoad="1"/>'); }
else 책 = 책.replace('</workbook>', '<calcPr fullCalcOnLoad="1"/></workbook>');
글넣기(책항목, 책);

fs.writeFileSync(낼곳, 묶는다());
fs.writeFileSync(기록곳, JSON.stringify(기록, null, 1));
console.log('기자 ' + 기록.일반줄수 + '명 · 채운 보도자료 칸 ' + 기록.채운칸.length + '개 · 이미 같은 값이던 칸 ' + 기록.그대로둔칸.length + '개 · 값이 다른 칸 ' + 기록.다름.length + '개 · 검색하지 않아 비워 둔 칸 ' + 기록.비워둔칸수 + '개 · 빨강 처리한 일반 칸 ' + 기록.빨강칸.length + '개');
for (const d of 기록.다름) console.log('  다름: ' + d.기자 + ' ' + d.달 + ' — 엑셀 ' + d.엑셀 + ' · 검색 ' + d.검색);
