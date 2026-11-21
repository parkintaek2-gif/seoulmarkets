/**
 * 문화공공데이터광장(culture.go.kr) 목록을 «갈래별로 통째로» 받아 아카이브한다.
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 [2026-09-04 사장님 지시 원문]
 *   「공공기관이다. 문체부 산하 한국문화정보원 운영하는 두 개 사이트. 데이터 수집해라」
 *   「이 사이트 일일이 한번 봐라. 네가 총괄이잖아. 너뿐만 아니라 «다른 유닛»에 쓸만한
 *     자료 찾아봐 … 일일이 확인해서 «너를 포함한 우리 사이트»에서 쓸만한 자료 찾아」
 *   갈래를 다섯 짚어 주셨다 —
 *   문화 키워드 데이터 · 공공데이터포털 · 국가통계포털 · 자치단체 데이터포털 · 문화데이터 경진대회
 *
 * ⛔ 이 자는 «목록을 아카이브»만 한다. 원자료를 받는 것은 다음 걸음이다.
 *   무엇이 있는지 먼저 세지 않고 골라 담으면, 사장님이 잡아 주신
 *   「데이터가 좋은지 안 좋은지 떠나서 «파악»했어야지」를 또 어긴다.
 *
 * ⚠ 재서 안 것 (2026-09-04)
 *   · 쪽 칸은 pageIndex/currentPage/page 가 아니라 «pageNo» 다. 나머지는 조용히 1쪽을 돌려준다
 *   · 총 건수는 태그 사이에 끼어 있다 — 태그를 지운 «뒤의 글»에서 잰다
 *   · 화면 꼴이 갈래마다 다르다. 파서를 하나로 두면 0건을 받고도 성공한 척한다
 */
import fs from 'node:fs';
import path from 'node:path';

export const 밑주소 = 'https://www.culture.go.kr';
export const 손님딱지 = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export const 갈래들 = [
  { 딱지: 'openapi', 이름: '오픈API', 길: '/data/openapi/openapiList.do?gubun=A', 꼴: 'openapi' },
  { 딱지: 'filedata', 이름: '파일데이터', 길: '/data/filedat/filedatList.do', 꼴: 'filedata' },
  /* ⚠ 이 갈래만 쪽 넘김에 apiClCd 가 함께 붙는다 — 빼면 늘 1쪽을 돌려준다 */
  { 딱지: 'keyword', 이름: '문화 키워드 데이터', 길: '/data/lnkdat/newPblcDatList.do?apiClCd=01', 꼴: 'keyword' },
  { 딱지: 'kosis', 이름: '국가통계포털', 길: '/data/lnkdat/ntnStatsList.do', 꼴: 'kosis' },
  { 딱지: 'localgov', 이름: '자치단체 데이터포털', 길: '/data/portalMng/portalMngList.do', 꼴: 'localgov' },
  { 딱지: 'catalog', 이름: '카탈로그 데이터', 길: '/data/linkOpenApi/linkOpenApiList.do', 꼴: 'catalog' },
  { 딱지: 'immersive', 이름: '실감형 데이터', 길: '/data/contents/3DList.do?bbsId=BBS0008', 꼴: 'immersive' },
  { 딱지: 'geo', 이름: '위치정보 데이터', 길: '/data/dataMap/dataMapList.do', 꼴: 'geo' },
];

/** 태그를 지우고 «보이는 조각들»로 만든다. 총 건수가 태그 사이에 끼어 있어 이 뒤에 재야 잡힌다. */
export function 조각들(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<').replace(/&quot;/g, '"')
    .split('\n').map((s) => s.trim()).filter((s) => s && s !== '-->');
}
export const 보이는글 = (h) => 조각들(h).join(' ');

/** 「총 466 건의 결과가 있습니다」에서 466. 못 찾으면 null —  */
export function 총건수(html) {
  const m = 보이는글(html).match(/총\s*([0-9][0-9,]*)\s*건/);
  return m ? Number(m[1].replace(/,/g, '')) : null;
}

const 숫자 = (s) => (s == null ? null : Number(String(s).replace(/[^0-9]/g, '')) || 0);

/** 오픈API 꼴: REST | JSON XML | 제목 | XLSX | 설명… | 등록일 D | 수정일 D | 호출건수 N | 데이터 N건 | 분류… */
function 뽑기_openapi(t) {
  const 것들 = [];
  for (let i = 0; i < t.length; i += 1) {
    if (!/^(REST|SOAP)$/.test(t[i])) continue;
    const 창 = t.slice(i, i + 30);
    const 제목 = 창.slice(1, 4).find((s) => s.length > 4 && !/^(JSON|XML|JSON XML|XLSX|LINK)$/.test(s));
    if (!제목) continue;
    const 값 = (이름) => { const k = 창.indexOf(이름); return k >= 0 ? 창[k + 1] : null; };
    const 시작 = 창.indexOf(제목) + 1;
    const 끝 = 창.indexOf('등록일');
    const 데이터칸 = 창.indexOf('데이터');
    것들.push({
      제목,
      설명: (끝 > 시작 ? 창.slice(시작, 끝) : [])
        .filter((s) => !/^(XLSX|JSON|XML|LINK|JSON XML)$/.test(s)).join(' ').slice(0, 600),
      등록일: 값('등록일'),
      수정일: 값('수정일'),
      호출건수: 숫자(값('호출건수')),
      데이터건수: 숫자(값('데이터')),
      분류: 데이터칸 >= 0 ? 창.slice(데이터칸 + 2, 데이터칸 + 5).filter((s) => s && !/^[0-9]/.test(s)) : [],
    });
  }
  return 것들;
}

/** 파일데이터 꼴: CSV | BATCH | 제목 | CSV | 설명 | 데이터생성일 D | 수정일 D | 갱신주기 X | 다운로드수 N건 */
function 뽑기_filedata(t) {
  const 것들 = [];
  for (let i = 0; i < t.length; i += 1) {
    if (t[i] !== 'BATCH') continue;
    const 제목 = t[i + 1];
    if (!제목 || 제목.length < 4) continue;
    const 창 = t.slice(i, i + 24);
    const 값 = (이름) => { const k = 창.indexOf(이름); return k >= 0 ? 창[k + 1] : null; };
    const s = 창.indexOf(제목) + 1;
    const e = 창.indexOf('데이터생성일');
    것들.push({
      제목,
      설명: (e > s ? 창.slice(s, e) : []).filter((x) => !/^(CSV|XLSX|JSON|XML|BATCH)$/.test(x)).join(' ').slice(0, 600),
      데이터생성일: 값('데이터생성일'),
      수정일: 값('수정일'),
      갱신주기: 값('갱신주기'),
      다운로드수: 숫자(값('다운로드수')),
    });
  }
  return 것들;
}

/** 키워드/카탈로그/실감형 꼴: 오픈API | XML | 제목 | 설명… | 제공기관 X | 수정일 D | …호출건수 N */
function 뽑기_keyword(t) {
  const 것들 = [];
  /* 🔴 [2026-09-04 실측] 창의 왼쪽 끝을 «앞 줄의 바로가기»에 못박지 않았더니
     화면 부속(「검색」·「내용」·「최신순」)을 제목으로 집었고, 그 가짜 제목들이
     서로 겹쳐 중복으로 걸러지면서 **11,234건 중 69건만 담겼다.**
     0건이면 눈에 띄는데 69건이라 성공한 척 넘어갈 뻔했다. */
  /* ⚠ 한 쪽의 «첫 항목»은 앞에 바로가기가 없어 창이 화면 머리까지 뻗는다.
     그래서 목록 머리(「제목순」·「건의 결과가 있습니다.」)를 왼쪽 끝으로 삼는다.
     이걸 안 하면 첫 항목 제목이 「기관명」·「총」으로 잡히고, 그 가짜 제목이 쪽마다 겹쳐
     중복으로 걸러지면서 **11,234건이 1,200건에서 멈춘다** (2026-09-04 실측). */
  let 앞칸끝 = Math.max(
    t.lastIndexOf('제목순'),
    t.findIndex((s) => /건의 결과가 있습니다/.test(s)),
    -1,
  );
  const 부속 = /^(최신순|조회순|인기순|제목순|검색|내용|전체|제목|바로가기|기관명|수정일|등록일|총|건의 결과가 있습니다\.)$/;
  for (let i = 0; i < t.length; i += 1) {
    if (t[i] === '바로가기') { 앞칸끝 = i; continue; }
    if (t[i] !== '제공기관') continue;
    const 창머리 = Math.max(앞칸끝 + 1, i - 14);
    const 창 = t.slice(창머리, i + 10);
    const 값 = (이름) => { const k = 창.indexOf(이름); return k >= 0 ? 창[k + 1] : null; };
    const 앞 = t.slice(창머리, i)
      .filter((s) => !/^(오픈API|파일데이터|REST|SOAP)$/.test(s))
      /* ⚠ 대소문자를 가리면 「csv」·「json」 소문자 딱지를 제목으로 집는다 (200·500쪽에서 실측) */
      .filter((s) => !/^(json|xml|csv|xlsx|link|zip|pdf|txt|hwp|shp|json\+xml|json xml|xml\+json)$/i.test(s))
      .filter((s) => !부속.test(s));
    앞칸끝 = i;
    if (!앞.length) continue;
    것들.push({
      제목: 앞[0],
      설명: 앞.slice(1).join(' ').slice(0, 600),
      제공기관: 값('제공기관'),
      수정일: 값('수정일') || 값('등록일'),
      원천호출건수: 숫자(값('원천기관 호출건수')),
      조회건수: 숫자(값('바로가기 조회건수')),
    });
  }
  return 것들;
}

/**
 * 화면의 「바로가기」가 부르는 자리에 «표 번호»가 들어 있다 —
 *   fnLinkDtlView('150','TX_15002_A090')  →  orgId=150 · tblId=TX_15002_A090
 * ⭐ 이 둘이 있으면 «이미 가진 KOSIS 키»로 그 표를 바로 받을 수 있다.
 *   태그를 지운 글에는 안 남으므로, 원본에서 따로 뽑아 순서대로 이어 붙인다.
 */
export function 표번호뽑기(html) {
  return [...String(html).matchAll(/fnLinkDtlView\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/g)]
    .map((m) => ({ 기관번호: m[1], 표번호: m[2] }));
}

/** 국가통계포털 꼴: 대분류 | > 중분류 | > 소분류 | 표이름 | 제공기관 X | 등록일 D */
function 뽑기_kosis(t) {
  const 것들 = [];
  let 앞칸끝 = -1; /* ⚠ 앞 줄의 「등록일·날짜·바로가기」가 다음 줄로 새어 들어왔다 —
                     창의 왼쪽 끝을 «앞 줄의 바로가기»에 못박아 막는다 */
  for (let i = 0; i < t.length; i += 1) {
    if (t[i] === '바로가기') { 앞칸끝 = i; continue; }
    if (t[i] !== '제공기관') continue;
    const 앞 = t.slice(Math.max(앞칸끝 + 1, i - 6), i).filter(Boolean);
    앞칸끝 = i;
    if (앞.length < 1) continue;
    const 길 = 앞.filter((s) => s.trim().startsWith('>')).map((s) => s.replace(/^>\s*/, '').trim());
    const 표이름 = 앞[앞.length - 1];
    것들.push({
      제목: 표이름,
      분류: [앞[0], ...길].filter((s) => s && s !== 표이름),
      제공기관: t[i + 1],
      등록일: t[i + 2] === '등록일' ? t[i + 3] : null,
    });
  }
  return 것들;
}

/** 자치단체 꼴: [파일데이터|오픈API] 제목 설명 등록일 D 수정일 D 기관명 X 바로가기 */
function 뽑기_localgov(t) {
  const 것들 = [];
  for (const 조각 of t.join(' ').split(/\s(?=파일데이터\s|오픈API\s)/)) {
    const m = 조각.match(/^(파일데이터|오픈API)\s+(.+?)\s+등록일\s+([0-9]{4}-[0-9]{2}-[0-9]{2})\s+수정일\s+([0-9]{4}-[0-9]{2}-[0-9]{2})\s+기관명\s+(.+?)\s+바로가기/);
    if (!m) continue;
    const 몸 = m[2];
    const 빈 = 몸.indexOf(' ');
    것들.push({
      종류: m[1],
      제목: 빈 > 0 ? 몸.slice(0, 빈) : 몸,
      설명: (빈 > 0 ? 몸.slice(빈 + 1) : '').slice(0, 600),
      등록일: m[3], 수정일: m[4], 제공기관: m[5],
    });
  }
  return 것들;
}

/** 카탈로그 꼴: 1371029-001 | 제목 | 설명 | 등록일 D | 조회수 N | [ 분야 : 도서 ] */
function 뽑기_catalog(t) {
  const 것들 = [];
  for (let i = 0; i < t.length; i += 1) {
    if (!/^[0-9A-Z]{6,8}-[0-9]{3}$/.test(t[i])) continue;
    const 창 = t.slice(i, i + 20);
    const 값 = (이름) => { const k = 창.indexOf(이름); return k >= 0 ? 창[k + 1] : null; };
    const 끝 = 창.indexOf('등록일');
    const 분야칸 = 창.indexOf('분야');
    것들.push({
      목록번호: t[i],
      제목: t[i + 1],
      설명: (끝 > 2 ? 창.slice(2, 끝) : []).join(' ').slice(0, 600),
      등록일: 값('등록일'),
      조회수: 숫자(값('조회수')),
      분야: 분야칸 >= 0 ? 창[분야칸 + 2] : null,
    });
  }
  return 것들;
}

/** 실감형 꼴: 실감3D모델 | 미리보기 | 이름 | 이름 | 조회수 N | 날짜 */
function 뽑기_immersive(t) {
  const 것들 = [];
  for (let i = 0; i < t.length; i += 1) {
    if (t[i] !== '미리보기') continue;
    const 이름 = t[i + 1];
    if (!이름 || 이름 === '조회수') continue;
    const 창 = t.slice(i, i + 8);
    const k = 창.indexOf('조회수');
    것들.push({
      제목: 이름,
      종류: t[i - 1] || null,
      조회수: k >= 0 ? 숫자(창[k + 1]) : null,
      등록일: k >= 0 ? 창[k + 2] : null,
    });
  }
  return 것들;
}

/** 위치정보 꼴: 제목 | 위치 찾기 Map | 지역별 검색 | 설명 | 등록일 D | 수정일 D | 호출건수 N | 분류들 */
function 뽑기_geo(t) {
  const 것들 = [];
  for (let i = 1; i < t.length; i += 1) {
    if (t[i] !== '위치 찾기 Map') continue;
    const 창 = t.slice(i, i + 22);
    const 값 = (이름) => { const k = 창.indexOf(이름); return k >= 0 ? 창[k + 1] : null; };
    const s = 창.indexOf('지역별 검색') + 1;
    const e = 창.indexOf('등록일');
    const 호출칸 = 창.indexOf('호출건수');
    것들.push({
      제목: t[i - 1],
      설명: (e > s && s > 0 ? 창.slice(s, e) : []).join(' ').slice(0, 600),
      등록일: 값('등록일'),
      수정일: 값('수정일'),
      호출건수: 숫자(값('호출건수')),
      분류: 호출칸 >= 0 ? [...new Set(창.slice(호출칸 + 2, 호출칸 + 5).filter(Boolean))] : [],
    });
  }
  return 것들;
}

const 파서 = {
  openapi: 뽑기_openapi, filedata: 뽑기_filedata,
  keyword: 뽑기_keyword, kosis: 뽑기_kosis, localgov: 뽑기_localgov,
  catalog: 뽑기_catalog, immersive: 뽑기_immersive, geo: 뽑기_geo,
};
export function 항목뽑기(html, 꼴) { return (파서[꼴] || 뽑기_keyword)(조각들(html)); }

export async function 받기(주소, 다시 = 3) {
  for (let i = 0; i < 다시; i += 1) {
    try {
      const r = await fetch(주소, {
        headers: { 'user-agent': 손님딱지, 'accept-language': 'ko' },
        signal: AbortSignal.timeout(45000),
      });
      if (r.ok) return await r.text();
    } catch { /* 다시 해 본다 */ }
    await new Promise((끝) => setTimeout(끝, 1200 * (i + 1)));
  }
  return null;
}

export function 오늘딱지(d = new Date()) {
  /* ⚠ toISOString 을 쓰지 않는다 — UTC 라 새벽에 하루가 어긋난다 (CLAUDE.md) */
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ── 자가시험 ─────────────────────────────────────────────────────────────── */
export function 재기() {
  const 참 = []; const 거 = [];
  const 봄 = (이름, 값) => (값 ? 참 : 거).push(이름);

  봄('총건수를 태그 사이에서 잡는다', 총건수('<p>총 <span>466</span> 건의 결과가 있습니다.</p>') === 466);
  봄('쉼표가 든 총건수', 총건수('총 <b>11,234</b> 건의 결과가 있습니다.') === 11234);
  봄('총건수가 없으면 null ()', 총건수('<p>결과가 없습니다</p>') === null);
  봄('스크립트 안의 글을 세지 않는다', 총건수('<script>var x="총 999 건";</script><p>총 5 건의 결과</p>') === 5);

  const o = 항목뽑기('<i>REST</i><i>JSON XML</i><a>영화진흥위원회 외_기관별 영화정보</a><i>XLSX</i><p>설명이다</p><b>등록일</b><b>2026. 8. 26</b><b>수정일</b><b>2026-09-01</b><b>호출건수</b><b>5</b><b>데이터</b><b>122,624건</b><i>문화산업</i><i>창작물</i><i>영화/영상</i>', 'openapi');
  봄('오픈API 한 건을 뽑는다', o.length === 1 && o[0].제목 === '영화진흥위원회 외_기관별 영화정보');
  봄('오픈API 의 «데이터 건수»를 숫자로 뽑는다', !!o[0] && o[0].데이터건수 === 122624);
  봄('오픈API 분류를 뽑는다', !!o[0] && o[0].분류.includes('문화산업'));
  봄('오픈API 설명에서 파일꼬리표를 걷어낸다', !!o[0] && !/XLSX/.test(o[0].설명));

  const f = 항목뽑기('<i>CSV</i><i>BATCH</i><a>한국체육산업개발_스포츠센터 종목정보</a><i>CSV</i><p>설명</p><b>데이터생성일</b><b>2026-08-31</b><b>수정일</b><b>2026-08-31</b><b>갱신주기</b><b>월간</b><b>다운로드수</b><b>3건</b>', 'filedata');
  봄('파일데이터 한 건을 뽑는다', f.length === 1 && /스포츠센터/.test(f[0].제목));
  봄('파일데이터 갱신주기를 뽑는다', !!f[0] && f[0].갱신주기 === '월간');

  const k = 항목뽑기('<i>오픈API</i><i>XML</i><a>한국문화예술교육진흥원_채용정보</a><p>설명이다</p><b>제공기관</b><b>한국문화예술교육진흥원</b><b>수정일</b><b>2026-09-01</b><b>원천기관 호출건수</b><b>4,124</b>', 'keyword');
  봄('키워드 꼴 한 건을 뽑는다', k.length === 1 && k[0].제공기관 === '한국문화예술교육진흥원');
  봄('키워드 꼴 호출건수를 숫자로', !!k[0] && k[0].원천호출건수 === 4124);

  /* 🔴 화면 부속(정렬 단추·검색칸)을 제목으로 집으면 가짜 제목들이 서로 겹쳐
     중복으로 걸러지고, 11,234건이 69건으로 줄어든다 (2026-09-04 실측). */
  const 부속낀 = 항목뽑기(
    '<b>최신순</b><b>조회순</b><b>제목순</b><i>오픈API</i><i>JSON+XML</i><a>한국문화정보원_전통문양조회서비스</a>'
    + '<p>설명이다</p><b>제공기관</b><b>한국문화정보원</b><b>수정일</b><b>2026-08-24</b><a>바로가기</a>'
    + '<i>오픈API</i><i>JSON+XML</i><a>한국문화정보원_전국문화기반시설총람</a><p>설명이다</p>'
    + '<b>제공기관</b><b>한국문화정보원</b><b>수정일</b><b>2026-08-20</b><a>바로가기</a>', 'keyword');
  봄('키워드 꼴 두 줄을 두 건으로 센다', 부속낀.length === 2);
  봄('정렬 단추를 제목으로 집지 않는다', 부속낀.length === 2 && 부속낀[0].제목 === '한국문화정보원_전통문양조회서비스');
  봄('둘째 줄이 첫째 줄의 꼬리를 안 먹는다', 부속낀.length === 2 && 부속낀[1].제목 === '한국문화정보원_전국문화기반시설총람');
  봄('JSON+XML 같은 포맷 딱지를 제목으로 집지 않는다', 부속낀.every((x) => !/JSON|XML/.test(x.제목)));

  const s = 항목뽑기('<a>국가유산관리현황</a><span>&nbsp;&gt;&nbsp;국가유산 현황</span><span>&nbsp;&gt;&nbsp;유형별 현황</span><a>건조물문화유산 현황</a><b>제공기관</b><b>문화재청</b><b>등록일</b><b>2022-01-03</b>', 'kosis');
  봄('국가통계포털 표 이름과 분류를 가른다', s.length === 1 && s[0].제목 === '건조물문화유산 현황' && s[0].분류.length === 3);

  /* 🔴 앞 줄의 「등록일·날짜·바로가기」가 다음 줄의 분류로 새어 들어왔다 (2026-09-04 실측).
     두 줄을 이어 붙여, 둘째 줄이 첫째 줄의 꼬리를 안 먹는지 본다. */
  const 두줄 = 항목뽑기(
    '<a>국가유산관리현황</a><span>&gt; 현황</span><a>표하나</a><b>제공기관</b><b>문화재청</b><b>등록일</b><b>2022-01-03</b><a>바로가기</a>'
    + '<a>국가유산관리현황</a><span>&gt; 수리</span><a>표둘</a><b>제공기관</b><b>문화재청</b><b>등록일</b><b>2022-01-03</b><a>바로가기</a>', 'kosis');
  봄('국가통계포털 두 줄을 두 건으로 센다', 두줄.length === 2);
  봄('둘째 줄이 첫째 줄의 꼬리(등록일·바로가기)를 안 먹는다',
    두줄.length === 2 && 두줄[1].제목 === '표둘' && !두줄[1].분류.some((x) => /등록일|바로가기|[0-9]{4}-/.test(x)));
  봄('국가통계포털 제공기관이 «등록일»로 잡히지 않는다', 두줄.every((x) => x.제공기관 === '문화재청'));

  const g = 항목뽑기('<span>파일데이터</span><a>부산광역시 수영구_해수욕장 이용객 일일현황</a><p>설명이다</p><b>등록일</b><b>2023-05-11</b><b>수정일</b><b>2024-11-20</b><b>기관명</b><b>부산광역시</b><a>바로가기</a>', 'localgov');
  봄('자치단체 꼴 한 건을 뽑는다', g.length === 1 && g[0].제공기관 === '부산광역시');

  봄('빈 화면에서 항목을 지어내지 않는다', 항목뽑기('<p>결과가 없습니다</p>', 'openapi').length === 0);
  봄('꼴을 모르면 그래도 지어내지 않는다', 항목뽑기('<p>아무것도 없다</p>', '모르는꼴').length === 0);

  const c = 항목뽑기('<b>1371029-001</b><a>국립중앙도서관_국가서지 링크드 오픈 데이터</a><p>설명이다</p><b>등록일</b><b>2025. 8. 14</b><b>조회수</b><b>74</b><i>[</i><i>분야</i><i>:</i><i>도서</i><i>]</i>', 'catalog');
  봄('카탈로그 한 건과 «분야»를 뽑는다', c.length === 1 && c[0].분야 === '도서' && c[0].조회수 === 74);

  const im = 항목뽑기('<span>실감3D모델</span><a>미리보기</a><b>신기전 화차</b><b>신기전 화차</b><i>조회수</i><i>2,807</i><i>2025-03-21</i>', 'immersive');
  봄('실감형 한 건과 조회수를 뽑는다', im.length === 1 && im[0].조회수 === 2807 && im[0].종류 === '실감3D모델');

  const ge = 항목뽑기('<a>한국문화정보원_카페가 있는 서점데이터</a><i>위치 찾기 Map</i><i>지역별 검색</i><p>설명이다</p><b>등록일</b><b>2024. 10. 24</b><b>수정일</b><b>2024-10-23</b><b>호출건수</b><b>4,949</b><i>문화산업</i><i>장소</i><i>장소</i>', 'geo');
  봄('위치정보 한 건과 호출건수를 뽑는다', ge.length === 1 && ge[0].호출건수 === 4949 && /서점데이터/.test(ge[0].제목));
  봄('위치정보 분류에서 겹친 값을 하나로 줄인다', !!ge[0] && ge[0].분류.length === 2);

  const 번호 = 표번호뽑기("<a onclick=\"fnLinkDtlView('150','TX_15002_A090')\">바로가기</a>"
    + "<a onclick=\"fnLinkDtlView('101','DT_1B040A3')\">바로가기</a>");
  봄('국가통계포털 표 번호 둘을 뽑는다', 번호.length === 2);
  봄('기관번호와 표번호를 가른다', 번호[0].기관번호 === '150' && 번호[0].표번호 === 'TX_15002_A090');
  봄('표 번호가 없으면 빈 목록 (지어내지 않는다)', 표번호뽑기('<p>없다</p>').length === 0);

  봄('새벽 2시 30분에도 날짜가 안 어긋난다 (UTC 를 안 쓴다)', 오늘딱지(new Date(2026, 0, 1, 2, 30)) === '2026-01-01');
  봄('연말에도 날짜가 안 어긋난다', 오늘딱지(new Date(2026, 11, 31, 23, 59)) === '2026-12-31');
  return { 참: 참.length, 거: 거.length, 틀린것: 거 };
}

const 나인가 = import.meta.url.endsWith(encodeURI(path.basename(String(process.argv[1] || 'x'))));
if (나인가) {
  const r = 재기();
  if (process.argv.includes('--재기')) {
    console.log(`자가시험 ${r.참}/${r.참 + r.거}`);
    if (r.거) { console.log('🔴 틀린 것:'); r.틀린것.forEach((x) => console.log('   · ' + x)); process.exit(1); }
    process.exit(0);
  }
  if (r.거) {
    console.log(`🔴 자가시험이 ${r.거}가지 깨졌다 — 수집을 멈춘다`);
    r.틀린것.forEach((x) => console.log('   · ' + x));
    process.exit(1);
  }
  console.log(`자가시험 ${r.참}/${r.참}\n`);

  const 방 = path.join(process.cwd(), 'archive', 'raw', 'culture-portal', 오늘딱지());
  fs.mkdirSync(방, { recursive: true });
  const 요약 = [];
  for (const g of 갈래들) {
    const 첫 = await 받기(밑주소 + g.길);
    if (!첫) {
      console.log(`  🔴 ${g.이름.padEnd(14)} 못 받았다`);
      요약.push({ 이름: g.이름, 딱지: g.딱지, 총: null, 받은: 0, 비고: '못 받았다' });
      continue;
    }
    const 총 = 총건수(첫);
    const 본것 = new Map();
    let 헛걸음 = 0;
    let 멈춘까닭 = null;
    /* 국가통계포털은 「바로가기」에 표 번호가 실려 있다 — 순서대로 이어 붙인다 */
    const 담기 = (것들, 원본) => {
      const 번호들 = g.꼴 === 'kosis' && 원본 ? 표번호뽑기(원본) : [];
      것들.forEach((x, i) => {
        if (!x.제목 || 본것.has(x.제목)) return;
        본것.set(x.제목, 번호들[i] ? { ...x, ...번호들[i] } : x);
      });
    };
    담기(항목뽑기(첫, g.꼴), 첫);
    const 쪽당 = 본것.size || 10;
    const 쪽수 = 총 == null ? 1 : Math.ceil(총 / 쪽당);
    const 쪽인자 = (process.argv.find((a) => a.startsWith('--pages=')) || '').split('=')[1];
    const 최대쪽 = Number(쪽인자 || 60);
    for (let p = 2; p <= Math.min(쪽수, 최대쪽); p += 1) {
      const 이음 = g.길.includes('?') ? '&' : '?';
      const h = await 받기(`${밑주소}${g.길}${이음}pageNo=${p}`);
      if (!h) break;
      const 앞 = 본것.size;
      담기(항목뽑기(h, g.꼴), h);
      /* 🔴 [2026-09-04] 한 쪽만 겹쳐도 바로 멈추게 했더니 문화 키워드가 119쪽에서 끊겨
         11,234건 중 1,188건만 담고 «성공»으로 끝났다. 겹치는 쪽이 중간에 섞여 있을 뿐인데
         그걸 「끝」으로 읽은 것이다. ✅ 세 쪽을 이어서 아무것도 못 담을 때만 멈춘다. */
      if (본것.size === 앞) { 헛걸음 += 1; } else { 헛걸음 = 0; }
      if (헛걸음 >= 3) { 멈춘까닭 = `${p}쪽까지 오는 동안 세 쪽 이어서 새 항목이 없었다`; break; }
      await new Promise((끝) => setTimeout(끝, 300));
    }
    const 것들 = [...본것.values()];
    fs.writeFileSync(path.join(방, `${g.딱지}.json`), JSON.stringify({
      갈래: g.이름, 딱지: g.딱지, 주소: 밑주소 + g.길,
      총건수: 총, 받은건수: 것들.length,
      /* ⛔ 「못 다 받았다」를 숨기지 않는다 — 왜 멈췄는지 파일에 함께 남긴다 */
      멈춘까닭: 멈춘까닭,
      잰때: new Date().toLocaleString('ko-KR'), 항목: 것들,
    }, null, 1), 'utf8');
    const 몫 = 총 ? Math.round(것들.length / 총 * 100) : 0;
    console.log(`  ${것들.length ? '✅' : '🔴'} ${g.이름.padEnd(14)} 총 ${총 == null ? '못 쟀다' : `${String(총).padStart(6)}건`} · 받은 ${String(것들.length).padStart(5)}건 (${몫}%)`);
    요약.push({ 이름: g.이름, 딱지: g.딱지, 총, 받은: 것들.length });
  }
  fs.writeFileSync(path.join(방, '_요약.json'), JSON.stringify({
    잰때: new Date().toLocaleString('ko-KR'), 갈래: 요약,
  }, null, 1), 'utf8');
  console.log(`\n저장 ${방}`);
}
