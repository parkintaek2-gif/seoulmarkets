/**
 * xlsx-읽어본다.mjs — **우리가 만든 xlsx 를 되읽어 성한지 잰다.**
 *
 * 이 PC 에는 파이썬도 LibreOffice 도 없고 Excel COM 은 파일을 못 연다.
 * 그래서 만든 파일을 «다시 풀어» ZIP 구조와 XML 이 성한지 스스로 잰다.
 * ⛔ 「만들었다」를 「열린다」로 읽지 않는다 — 깨진 파일은 사장님 손에서 터진다.
 *
 * 쓰기:  node scripts/lib/xlsx-읽어본다.mjs <파일.xlsx>
 */
import fs from 'node:fs';
import zlib from 'node:zlib';

/** ZIP 을 풀어 {이름: 글} 로 준다. crc 가 안 맞으면 던진다 */
export function 푼다(길) {
  const b = fs.readFileSync(길);
  const 끝자리 = b.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (끝자리 < 0) throw new Error('EOCD 가 없다 — ZIP 이 아니다');
  const 개수 = b.readUInt16LE(끝자리 + 10);
  const 가운데크기 = b.readUInt32LE(끝자리 + 12);
  const 가운데자리 = b.readUInt32LE(끝자리 + 16);
  if (가운데자리 + 가운데크기 > b.length) throw new Error('중앙 디렉터리 자리가 파일 밖이다');

  const 것들 = {};
  let p = 가운데자리;
  for (let i = 0; i < 개수; i += 1) {
    if (b.readUInt32LE(p) !== 0x02014b50) throw new Error(`중앙 항목 ${i} 머리가 틀렸다`);
    const 방법 = b.readUInt16LE(p + 10);
    const crc = b.readUInt32LE(p + 16) >>> 0;
    const 눌린크기 = b.readUInt32LE(p + 20);
    const 날것크기 = b.readUInt32LE(p + 24);
    const 이름길이 = b.readUInt16LE(p + 28);
    const 여분길이 = b.readUInt16LE(p + 30);
    const 설명길이 = b.readUInt16LE(p + 32);
    const 앞자리 = b.readUInt32LE(p + 42);
    const 이름 = b.slice(p + 46, p + 46 + 이름길이).toString('utf8');

    if (b.readUInt32LE(앞자리) !== 0x04034b50) throw new Error(`${이름} 의 앞머리가 틀렸다`);
    const 앞이름길이 = b.readUInt16LE(앞자리 + 26);
    const 앞여분길이 = b.readUInt16LE(앞자리 + 28);
    const 몸자리 = 앞자리 + 30 + 앞이름길이 + 앞여분길이;
    const 몸 = b.slice(몸자리, 몸자리 + 눌린크기);
    const 날것 = 방법 === 0 ? 몸 : zlib.inflateRawSync(몸);
    if (날것.length !== 날것크기) throw new Error(`${이름} 크기가 안 맞는다`);
    if ((zlib.crc32(날것) >>> 0) !== crc) throw new Error(`${이름} crc 가 안 맞는다`);
    것들[이름] = 날것.toString('utf8');
    p += 46 + 이름길이 + 여분길이 + 설명길이;
  }
  return 것들;
}

/** 여는 표와 닫는 표의 짝이 맞나. ⚠ 제대로 된 파서가 아니다 — 깨진 것을 잡는 용도다 */
export function 표짝이맞나(xml) {
  const 쌓기 = [];
  const 표 = /<([/]?)([A-Za-z_][A-Za-z0-9:._-]*)([^>]*?)([/]?)>/g;
  let m = 표.exec(xml);
  while (m) {
    const 닫는가 = m[1] === '/';
    const 이름 = m[2];
    const 혼자닫나 = m[4] === '/';
    if (닫는가) {
      const 앞 = 쌓기.pop();
      if (앞 !== 이름) return `닫는 표가 안 맞는다 — ${앞 ?? '(없음)'} 자리에 ${이름}`;
    } else if (!혼자닫나) {
      쌓기.push(이름);
    }
    m = 표.exec(xml);
  }
  if (쌓기.length) return `안 닫힌 표 — ${쌓기.join(' > ')}`;
  return null;
}

/** 꼭 있어야 하는 파트가 다 있나 */
export const 꼭있을것 = [
  '[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml',
  'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/worksheets/sheet1.xml',
];

export function 잰다(길) {
  const 탈 = [];
  let 것들;
  try { 것들 = 푼다(길); } catch (e) { return { 탈: [String(e.message)], 것들: null }; }

  for (const 이름 of 꼭있을것) {
    if (!(이름 in 것들)) 탈.push(`파트가 없다 — ${이름}`);
  }
  for (const [이름, 글] of Object.entries(것들)) {
    if (!글.startsWith('<?xml')) 탈.push(`${이름} 이 XML 선언으로 시작하지 않는다`);
    const e = 표짝이맞나(글);
    if (e) 탈.push(`${이름} — ${e}`);
  }

  /* 장 수와 관계·콘텐트타입이 서로 맞나 */
  const wb = 것들['xl/workbook.xml'] ?? '';
  const 장수 = (wb.match(/<sheet /g) || []).length;
  const 장파일 = Object.keys(것들).filter((n) => /^xl\/worksheets\/sheet[0-9]+[.]xml$/.test(n)).length;
  if (장수 !== 장파일) 탈.push(`workbook 의 장 ${장수}개와 실제 장 파일 ${장파일}개가 다르다`);
  const ct = 것들['[Content_Types].xml'] ?? '';
  for (let i = 1; i <= 장파일; i += 1) {
    if (!ct.includes(`/xl/worksheets/sheet${i}.xml`)) 탈.push(`Content_Types 에 sheet${i} 가 없다`);
  }

  /* sheetViews 는 sheetData «앞»에 와야 한다 — 뒤에 있으면 엑셀이 고치겠다고 묻는다 */
  for (const [이름, 글] of Object.entries(것들)) {
    if (!/worksheets\/sheet/.test(이름)) continue;
    const v = 글.indexOf('<sheetViews');
    const d = 글.indexOf('<sheetData');
    if (v >= 0 && d >= 0 && v > d) 탈.push(`${이름} — sheetViews 가 sheetData 뒤에 있다`);
    const c = 글.indexOf('<cols');
    if (c >= 0 && v >= 0 && c < v) 탈.push(`${이름} — cols 가 sheetViews 앞에 있다`);
  }

  /* 꼴 번호가 styles 의 cellXfs 개수를 넘지 않나 */
  const st = 것들['xl/styles.xml'] ?? '';
  const xf개수 = Number((st.match(/<cellXfs count="([0-9]+)"/) || [])[1] || 0);
  for (const [이름, 글] of Object.entries(것들)) {
    if (!/worksheets\/sheet/.test(이름)) continue;
    for (const m of 글.matchAll(/ s="([0-9]+)"/g)) {
      if (Number(m[1]) >= xf개수) { 탈.push(`${이름} — 꼴 번호 ${m[1]} 이 cellXfs ${xf개수}개를 넘는다`); break; }
    }
  }

  return { 탈, 것들 };
}

if (process.argv[1] && process.argv[1].endsWith('xlsx-읽어본다.mjs')) {
  const 길 = process.argv[2];
  if (!길) { console.error('쓰기: node scripts/lib/xlsx-읽어본다.mjs <파일.xlsx>'); process.exit(1); }
  const { 탈, 것들 } = 잰다(길);
  if (!것들) { console.error('⛔ 못 풀었다 — ' + 탈.join(' / ')); process.exit(1); }
  console.log('파트 ' + Object.keys(것들).length + '개 — ' + Object.keys(것들).join(' · '));
  const 장들 = Object.keys(것들).filter((n) => /worksheets\/sheet/.test(n));
  for (const n of 장들) {
    const 줄 = (것들[n].match(/<row /g) || []).length;
    const 수식 = (것들[n].match(/<f>/g) || []).length;
    console.log(`   ${n} — 줄 ${줄}개 · 수식 ${수식}개`);
  }
  if (탈.length) {
    for (const t of 탈) console.error('🔴 ' + t);
    console.error(`⛔ ${탈.length}곳이 성하지 않다`);
    process.exit(1);
  }
  console.log('✅ 성하다 — ZIP·crc·XML 짝·파트·꼴번호를 다 쟀다');
}
