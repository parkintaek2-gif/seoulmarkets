/**
 * xlsx-쓴다.mjs — **엑셀 파일을 바깥 꾸러미 없이 만든다.**
 *
 * ── 왜 이 도구가 생겼나 ─────────────────────────────────────────
 * 사장님이 「엑셀 파일로」 달라 하셨는데 이 PC 에는
 *   · 파이썬이 없다 (WindowsApps 의 자리표만 있어 `python` 이 아무것도 안 한다)
 *   · exceljs·xlsx 꾸러미가 없고 새로 받는 것이 막혀 있다
 * 그래서 xlsx 를 직접 쓴다. xlsx 는 ZIP 안에 든 XML 묶음이고,
 * Node 의 zlib 에 crc32 와 deflateRawSync 가 있어 ZIP 을 손으로 묶을 수 있다.
 *
 * ⛔ 워드처럼 「풀었다 다시 묶으면」 깨진다 — 여기서는 처음부터 새로 묶는다.
 * ⛔ Compress-Archive 를 쓰지 않는다. 사장님 휴대폰에서 오류 912 를 낸 그 길이다.
 *
 * ── 쓰는 법 ────────────────────────────────────────────────────
 *   import { 통만든다, 적는다 } from './lib/xlsx-쓴다.mjs';
 *   const 통 = 통만든다();
 *   const 장 = 통.새장('기자별 월 기사수');
 *   장.너비([6, 15, 10, 9, 9]);
 *   장.틀고정('D2');
 *   장.줄([{ v: '순위', 꼴: '머리' }, { v: '기자명', 꼴: '머리' }]);
 *   장.줄([{ v: 1, 꼴: '수' }, { v: '천성남' }, { f: 'SUM(D2:M2)', 꼴: '수' }]);
 *   적는다(통, 'out.xlsx');
 *
 * 꼴 — 머리 · 글 · 글왼쪽 · 수 · 소수 · 퍼센트 · 굵은수 · 굵은소수 · 굵은퍼센트 ·
 *      굵은글 · 빨강글 · 빨강수 · 빨강소수 · 빨강퍼센트 · 주석 · 빨강주석
 *
 * ⚠ 수식에는 값을 넣지 않는다. workbook 에 fullCalcOnLoad 를 걸어 두어
 *   엑셀이 열 때 전부 계산한다. 계산 전에 pandas 같은 것으로 읽으면 빈 칸이다.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';

/* ── 꼴표 — cellXfs 의 차례와 같아야 한다 ── */
export const 꼴번호 = {
  없음: 0,
  머리: 1,
  글: 2,
  글왼쪽: 3,
  수: 4,
  소수: 5,
  퍼센트: 6,
  굵은수: 7,
  굵은소수: 8,
  굵은퍼센트: 9,
  굵은글: 10,
  빨강글: 11,
  빨강수: 12,
  빨강소수: 13,
  빨강퍼센트: 14,
  주석: 15,
  빨강주석: 16,
  /* 입력 칸 — 노란 칠에 파란 글자. 금융 모델의 관례대로 «사람이 고치는 칸»을 가리킨다 */
  입력수: 17,
  입력소수: 18,
  이름표: 19,
};

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3">
<numFmt numFmtId="164" formatCode="#,##0"/>
<numFmt numFmtId="165" formatCode="#,##0.0"/>
<numFmt numFmtId="166" formatCode="0.0%"/>
</numFmts>
<fonts count="5">
<font><sz val="10"/><name val="Arial"/></font>
<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>
<font><b/><sz val="10"/><name val="Arial"/></font>
<font><sz val="10"/><color rgb="FFC00000"/><name val="Arial"/></font>
<font><b/><sz val="10"/><color rgb="FF0000FF"/><name val="Arial"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1F4E79"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFFF00"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border>
<left style="thin"><color rgb="FFBFBFBF"/></left>
<right style="thin"><color rgb="FFBFBFBF"/></right>
<top style="thin"><color rgb="FFBFBFBF"/></top>
<bottom style="thin"><color rgb="FFBFBFBF"/></bottom>
<diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="20">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="164" fontId="2" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="165" fontId="2" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="166" fontId="2" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>
<xf numFmtId="164" fontId="3" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="165" fontId="3" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="166" fontId="3" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="164" fontId="4" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="165" fontId="4" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

/** XML 에서 뜻을 가지는 다섯 글자를 막는다 */
export function 감싼다(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** 1 → A · 27 → AA */
export function 열이름(n) {
  let s = '';
  let x = n;
  while (x > 0) {
    const r = (x - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

/** 장 이름에 쓸 수 없는 글자를 바꾼다. 엑셀 한도는 31자다 */
export function 장이름다듬기(이름) {
  const s = String(이름).replace(/[\\/?*[\]:]/g, '-').slice(0, 31);
  return s || 'Sheet';
}

export function 통만든다() {
  const 장들 = [];
  return {
    장들,
    새장(이름) {
      const 장 = {
        이름: 장이름다듬기(이름),
        줄들: [],
        너빗값: null,
        고정: null,
        너비(값들) { this.너빗값 = 값들; return this; },
        틀고정(칸) { this.고정 = 칸; return this; },
        줄(칸들) { this.줄들.push(칸들 || []); return this; },
        빈줄(수 = 1) { for (let i = 0; i < 수; i += 1) this.줄들.push([]); return this; },
      };
      장들.push(장);
      return 장;
    },
  };
}

function 장XML(장) {
  const 조각 = [];
  조각.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
  조각.push('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">');
  /* 🔴 스키마 차례가 정해져 있다 — sheetViews 가 cols «앞»이고 cols 가 sheetData 앞이다.
     2026-11-24 에 cols 를 먼저 쓰고 sheetViews 를 나중에 끼워 넣어 차례가 뒤집혔다.
     되읽기 검사가 잡았다. 엑셀은 이런 파일을 「고치겠습니까」로 맞는다 */
  if (장.고정) {
    const 칸 = String(장.고정);
    const m = 칸.match(/^([A-Z]+)([0-9]+)$/);
    const xSplit = m ? m[1].split('').reduce((a, ch) => a * 26 + (ch.charCodeAt(0) - 64), 0) - 1 : 0;
    const ySplit = m ? Number(m[2]) - 1 : 0;
    조각.push('<sheetViews><sheetView workbookViewId="0">'
      + `<pane xSplit="${xSplit}" ySplit="${ySplit}" topLeftCell="${칸}" activePane="bottomRight" state="frozen"/>`
      + '</sheetView></sheetViews>');
  }
  if (장.너빗값 && 장.너빗값.length) {
    조각.push('<cols>');
    장.너빗값.forEach((w, i) => {
      조각.push(`<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`);
    });
    조각.push('</cols>');
  }
  조각.push('<sheetData>');
  장.줄들.forEach((칸들, ri) => {
    const r = ri + 1;
    if (!칸들.length) { 조각.push(`<row r="${r}"/>`); return; }
    조각.push(`<row r="${r}">`);
    칸들.forEach((칸, ci) => {
      if (칸 === null || 칸 === undefined) return;
      const 자리 = 열이름(ci + 1) + r;
      const s = 꼴번호[칸.꼴] ?? 꼴번호.없음;
      if (칸.f !== undefined && 칸.f !== null) {
        /* 🔴🔴 수식에는 «계산한 값»을 함께 넣는다 (2026-11-24).
           값 없이 수식만 넣으면 엑셀 데스크톱은 열 때 계산하지만
           **원드라이브 미리보기·휴대폰 앱·엑셀 웹은 빈 칸으로 보여 준다.**
           사장님이 받으신 표에서 합계 줄이 통째로 비어 보였다. 그 자리다.
           ⛔ 값을 넣었다고 수식을 빼지 않는다 — 칸을 고치면 다시 계산되어야 한다 */
        const 값 = 칸.v;
        if (typeof 값 === 'number' && Number.isFinite(값)) {
          조각.push(`<c r="${자리}" s="${s}"><f>${감싼다(칸.f)}</f><v>${값}</v></c>`);
        } else if (typeof 값 === 'string' && 값 !== '') {
          조각.push(`<c r="${자리}" s="${s}" t="str"><f>${감싼다(칸.f)}</f><v>${감싼다(값)}</v></c>`);
        } else {
          조각.push(`<c r="${자리}" s="${s}"><f>${감싼다(칸.f)}</f></c>`);
        }
        return;
      }
      const v = 칸.v;
      if (v === null || v === undefined || v === '') {
        조각.push(`<c r="${자리}" s="${s}"/>`);
        return;
      }
      if (typeof v === 'number' && Number.isFinite(v)) {
        조각.push(`<c r="${자리}" s="${s}"><v>${v}</v></c>`);
        return;
      }
      조각.push(`<c r="${자리}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${감싼다(v)}</t></is></c>`);
    });
    조각.push('</row>');
  });
  조각.push('</sheetData>');
  조각.push('</worksheet>');
  return 조각.join('');
}

/* ── ZIP 묶기 ── */
function 한항목(이름, 글) {
  const 이름바이트 = Buffer.from(이름, 'utf8');
  const 날것 = Buffer.from(글, 'utf8');
  const 눌림 = zlib.deflateRawSync(날것, { level: 9 });
  const crc = zlib.crc32(날것) >>> 0;
  return { 이름바이트, 날것길이: 날것.length, 눌림, crc };
}

export function 적는다(통, 낼곳) {
  const 파일들 = [];
  파일들.push(['[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    + 통.장들.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
    + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
    + '</Types>']);
  파일들.push(['_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
    + '</Relationships>']);
  파일들.push(['xl/workbook.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
    + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + '<sheets>'
    + 통.장들.map((장, i) => `<sheet name="${감싼다(장.이름)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')
    + '</sheets>'
    /* ⭐ 수식에 값을 안 넣었으므로 열 때 전부 계산하게 한다 */
    + '<calcPr calcId="191029" fullCalcOnLoad="1"/>'
    + '</workbook>']);
  파일들.push(['xl/_rels/workbook.xml.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + 통.장들.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
    + `<Relationship Id="rId${통.장들.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
    + '</Relationships>']);
  파일들.push(['xl/styles.xml', STYLES]);
  통.장들.forEach((장, i) => 파일들.push([`xl/worksheets/sheet${i + 1}.xml`, 장XML(장)]));

  const 앞조각 = [];
  const 가운데조각 = [];
  let 자리 = 0;
  for (const [이름, 글] of 파일들) {
    const { 이름바이트, 날것길이, 눌림, crc } = 한항목(이름, 글);
    const 머리 = Buffer.alloc(30);
    머리.writeUInt32LE(0x04034b50, 0);
    머리.writeUInt16LE(20, 4);
    머리.writeUInt16LE(0x0800, 6);      /* 이름이 UTF-8 이라고 알린다 */
    머리.writeUInt16LE(8, 8);           /* deflate */
    머리.writeUInt16LE(0, 10);
    머리.writeUInt16LE(0x2821, 12);     /* 날짜 자리 — 2020-01-01 */
    머리.writeUInt32LE(crc, 14);
    머리.writeUInt32LE(눌림.length, 18);
    머리.writeUInt32LE(날것길이, 22);
    머리.writeUInt16LE(이름바이트.length, 26);
    머리.writeUInt16LE(0, 28);
    앞조각.push(머리, 이름바이트, 눌림);

    const 가운데 = Buffer.alloc(46);
    가운데.writeUInt32LE(0x02014b50, 0);
    가운데.writeUInt16LE(20, 4);
    가운데.writeUInt16LE(20, 6);
    가운데.writeUInt16LE(0x0800, 8);
    가운데.writeUInt16LE(8, 10);
    가운데.writeUInt16LE(0, 12);
    가운데.writeUInt16LE(0x2821, 14);
    가운데.writeUInt32LE(crc, 16);
    가운데.writeUInt32LE(눌림.length, 20);
    가운데.writeUInt32LE(날것길이, 24);
    가운데.writeUInt16LE(이름바이트.length, 28);
    가운데.writeUInt16LE(0, 30);
    가운데.writeUInt16LE(0, 32);
    가운데.writeUInt16LE(0, 34);
    가운데.writeUInt16LE(0, 36);
    가운데.writeUInt32LE(0, 38);
    가운데.writeUInt32LE(자리, 42);
    가운데조각.push(가운데, 이름바이트);

    자리 += 머리.length + 이름바이트.length + 눌림.length;
  }
  const 가운데몸 = Buffer.concat(가운데조각);
  const 끝 = Buffer.alloc(22);
  끝.writeUInt32LE(0x06054b50, 0);
  끝.writeUInt16LE(0, 4);
  끝.writeUInt16LE(0, 6);
  끝.writeUInt16LE(파일들.length, 8);
  끝.writeUInt16LE(파일들.length, 10);
  끝.writeUInt32LE(가운데몸.length, 12);
  끝.writeUInt32LE(자리, 16);
  끝.writeUInt16LE(0, 20);

  fs.writeFileSync(낼곳, Buffer.concat([...앞조각, 가운데몸, 끝]));
  return 낼곳;
}
