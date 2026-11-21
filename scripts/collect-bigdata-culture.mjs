/**
 * 문화 빅데이터 포털(bigdata-culture.kr)의 «데이터 마켓» 목록을 받아 아카이브한다.
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 [2026-09-04 사장님 지시 원문]
 *   「bigdata-culture.kr 여기도 «무료데이터» 있어..일일이 확인해서 너를 포함한
 *     우리 사이트에서 쓸만한 자료 찾아」
 *
 * ⚠ 재서 안 것 (2026-09-04) — 여기까지 오는 데 네 걸음이 걸렸다. 다음 사람은 안 헤매게 적는다
 *   1. `list.do` 를 HTTP 로 받으면 목록이 «총 0건»으로 나온다. 화면이 자바스크립트로 그려진다
 *   2. 브라우저로 열면 1,373 이라 나오지만 «7건»만 그려져 있다 — 더보기로 이어 붙는 꼴이다
 *   3. 그 더보기가 부르는 자리를 잡았다 —
 *      POST /bigdata/user/data_market/process.ajax.do
 *      TP=list · funNm=dataMarketObj.ajax.call.getDataListFnList · currentPage=N
 *   4. ⛔ `pagePerBlock` 을 50 으로 올려도 «6건»만 준다. 쪽 크기는 서버가 정한다 —
 *      1,344건 / 224쪽. 그러니 224번을 부른다. 한 번에 받으려 하지 않는다
 *
 * ⛔ 로그인하지 않는다. 결제하지 않는다. 공개된 목록만 읽는다.
 */
import fs from 'node:fs';
import path from 'node:path';

export const 밑주소 = 'https://www.bigdata-culture.kr';
export const 목록길 = '/bigdata/user/data_market/list.do?dataCookieYn=N';
export const 아작스길 = '/bigdata/user/data_market/process.ajax.do';
export const 손님딱지 = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** 마켓의 갈래들 — 더보기가 부르는 이름이 갈래마다 다르다 */
export const 상자들 = [
  { 딱지: 'dataset', 이름: '데이터셋', TP: 'list', 함수: 'dataMarketObj.ajax.call.getDataListFnList', 상자: 'data_box01' },
  { 딱지: 'report', 이름: '분석 리포트', TP: 'report', 함수: 'dataMarketObj.ajax.call.getReportListFnList', 상자: 'data_box03' },
  { 딱지: 'subscription', 이름: '구독형 상품', TP: 'subscription', 함수: 'dataMarketObj.ajax.call.getSubscriptionListFnList', 상자: 'data_box05' },
];

export function 태그지우기(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

/** 응답 머리의 스크립트에 총건수·총쪽수가 들어 있다 */
export function 쪽셈(html) {
  const 총 = (String(html).match(/_total"\)\.val\("([0-9]+)"\)/) || [])[1];
  const 쪽 = (String(html).match(/_totalPage"\)\.val\("([0-9]+)"\)/) || [])[1];
  return { 총건수: 총 == null ? null : Number(총), 총쪽수: 쪽 == null ? null : Number(쪽) };
}

/** 한 항목(li)의 글에서 값을 가른다.
 *  꼴: 좋아요 <기관> <테마…> <포맷…> <가격> <제목> <설명…> 유형 X 가격 Y 데이터 갱신주기 Z YYYY.MM.DD 업데이트 */
export function 항목가르기(글, 아이디 = null) {
  const s = 태그지우기(글);
  const 가격 = (s.match(/가격\s+(무료|유료|협의)/) || [])[1] || null;
  const 갱신주기 = (s.match(/데이터 갱신주기\s+(\S+)/) || [])[1] || null;
  const 유형 = (s.match(/유형\s+([A-Z0-9,_]+)/) || [])[1] || null;
  const 갱신일 = (s.match(/([0-9]{4}\.[0-9]{2}\.[0-9]{2})\s*업데이트/) || [])[1] || null;

  /* 제목은 목록 꼬리표(무료/유료/협의) 바로 뒤에 온다. 설명은 「ㅇ」·「O」·「-」 로 시작한다 */
  let 제목 = null;
  const m = s.replace(/^좋아요\s*/, '').match(/(?:무료|유료|협의)\s+(.+?)(?:\s+(?:ㅇ|O\s|·|\.\.\.|유형\s)|$)/);
  if (m) 제목 = m[1].trim();
  if (제목 && 제목.length > 90) 제목 = 제목.slice(0, 90).trim();

  const 앞 = (s.replace(/^좋아요\s*/, '').match(/^(.*?)(?:무료|유료|협의)\s/) || ['', ''])[1];
  return {
    아이디, 제목, 가격, 유형, 갱신주기, 갱신일,
    꼬리표: 앞.trim().split(/\s+/).filter((x) => x && !/^(CSV|JSON|XLSX|ZIP|PDF|TXT|MP3|MP4|SHP|SHX|DBF|PNG|JPG|TTL|NT|기타)$/.test(x)),
    글: s.slice(0, 700),
  };
}

/** 한 쪽의 응답에서 항목들을 뽑는다.
 *  🔴 [2026-09-04 실측] 처음엔 `<li>` 로 잘랐다가 **아이디를 1,344건 모두 잃었다.**
 *     한 항목 안에 «안쪽 li» 가 여럿이라, 「가격 무료」가 든 조각과 data-id 가 든 조각이
 *     서로 다른 조각으로 갈렸다. 값은 다 있는데 이어 붙일 열쇠만 없어진 꼴이었다.
 *  ✅ 그래서 «data-id 를 경계»로 삼는다 — 한 항목에 하나뿐이고, 항목의 머리에 온다. */
export function 쪽에서뽑기(html) {
  const 글 = String(html);
  const 자리 = [...글.matchAll(/data-id="([a-z0-9-]{20,})"/g)];
  const 것들 = [];
  for (let i = 0; i < 자리.length; i += 1) {
    const 시작 = 자리[i].index;
    const 끝 = i + 1 < 자리.length ? 자리[i + 1].index : 글.length;
    /* 자른 자리가 여는 태그 한가운데다 — 첫 «>» 까지는 태그 부스러기이니 버린다 */
    const 덩이 = 글.slice(시작, 끝);
    const 조각 = 덩이.slice(덩이.indexOf('>') + 1);
    const x = 항목가르기(조각, 자리[i][1]);
    if (x.제목 && x.가격) 것들.push(x);
  }
  return 것들;
}

export function 오늘딱지(d = new Date()) {
  /* ⚠ toISOString 을 쓰지 않는다 — UTC 라 새벽에 하루가 어긋난다 */
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ── 자가시험 ─────────────────────────────────────────────────────────────── */
export function 재기() {
  const 참 = []; const 거 = [];
  const 봄 = (이름, 값) => (값 ? 참 : 거).push(이름);

  const 머리 = '<script>$("#data_box01_total").val("1344");$("#data_box01_totalPage").val("224");</script>';
  const c = 쪽셈(머리);
  봄('총건수를 응답 머리에서 읽는다', c.총건수 === 1344);
  봄('총쪽수를 응답 머리에서 읽는다', c.총쪽수 === 224);
  봄('없으면 null 로 둔다 ()', 쪽셈('<p>아무것도 없다</p>').총건수 === null);

  const 한줄 = '<li><a data-id="008f2300-3af2-11ec-bbc0-d7035fffebeb"><span>좋아요</span></a><span>문화소비</span><span>문화산업</span><span>CSV</span><span>무료</span><strong>공연시설 투자 예보</strong><p>ㅇ데이터 소개 - 전국 시군구별 공연시설명</p><span>유형</span><span>CSV</span><span>가격</span><span>무료</span><span>데이터 갱신주기</span><span>비주기</span><span>2026.07.24 업데이트</span></li>';
  const a = 쪽에서뽑기(머리 + '<ul>' + 한줄 + '</ul>');
  봄('한 줄에서 한 건을 뽑는다', a.length === 1);
  봄('제목을 뽑는다', !!a[0] && a[0].제목 === '공연시설 투자 예보');
  봄('가격을 «무료»로 읽는다', !!a[0] && a[0].가격 === '무료');
  봄('상세 아이디를 함께 담는다', !!a[0] && a[0].아이디 === '008f2300-3af2-11ec-bbc0-d7035fffebeb');
  봄('갱신주기를 뽑는다', !!a[0] && a[0].갱신주기 === '비주기');
  봄('갱신일을 뽑는다', !!a[0] && a[0].갱신일 === '2026.07.24');
  봄('꼬리표에서 파일 포맷을 걷어낸다', !!a[0] && a[0].꼬리표.includes('문화소비') && !a[0].꼬리표.includes('CSV'));

  const 유료줄 = 한줄.replace(/무료/g, '유료');
  const b = 쪽에서뽑기('<ul>' + 유료줄 + '</ul>');
  봄('유료 항목을 «유료»로 읽는다', b.length === 1 && b[0].가격 === '유료');

  봄('가격이 없는 줄은 담지 않는다 (지어내지 않는다)',
    쪽에서뽑기('<ul><li><span>좋아요</span><strong>제목만 있다</strong></li></ul>').length === 0);
  봄('빈 응답에서 항목을 지어내지 않는다', 쪽에서뽑기('').length === 0);

  /* 🔴 한 항목 안에 «안쪽 li» 가 있어도 아이디와 가격이 갈라지지 않아야 한다.
     처음 판은 이걸 못 견뎌 아이디를 1,344건 모두 잃었다. */
  const 겹친줄 = '<li><a data-id="11111111-2222-3333-4444-555555555555"><span>좋아요</span></a>'
    + '<ul><li>문화소비</li><li>문화산업</li><li>CSV</li></ul>'
    + '<strong>무료 겹친 항목</strong><ul><li>유형 CSV</li><li>가격 무료</li><li>데이터 갱신주기 Daily</li></ul></li>';
  const z = 쪽에서뽑기(겹친줄);
  봄('안쪽 li 가 있어도 한 건으로 센다', z.length === 1);
  봄('안쪽 li 가 있어도 아이디를 안 잃는다', z.length === 1 && z[0].아이디 === '11111111-2222-3333-4444-555555555555');
  봄('안쪽 li 가 있어도 가격을 읽는다', z.length === 1 && z[0].가격 === '무료');

  const 두건 = 쪽에서뽑기(겹친줄 + 겹친줄.replace(/1111/g, '9999').replace(/무료/g, '유료'));
  봄('두 항목을 두 건으로 가른다', 두건.length === 2 && 두건[0].가격 === '무료' && 두건[1].가격 === '유료');

  봄('새벽 2시에도 날짜가 안 어긋난다', 오늘딱지(new Date(2026, 0, 1, 2, 30)) === '2026-01-01');
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

  let 쿠키 = '';
  const 받 = async (길, 옵 = {}, 다시 = 3) => {
    for (let i = 0; i < 다시; i += 1) {
      try {
        const res = await fetch(밑주소 + 길, {
          ...옵,
          headers: {
            'user-agent': 손님딱지, 'accept-language': 'ko',
            'x-requested-with': 'XMLHttpRequest',
            ...(옵.headers || {}), ...(쿠키 ? { cookie: 쿠키 } : {}),
          },
          signal: AbortSignal.timeout(45000),
        });
        const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
        if (sc.length) 쿠키 = [...new Set([...(쿠키 ? 쿠키.split('; ') : []), ...sc.map((x) => x.split(';')[0])])].join('; ');
        if (res.ok) return await res.text();
      } catch { /* 다시 해 본다 */ }
      await new Promise((끝) => setTimeout(끝, 1200 * (i + 1)));
    }
    return null;
  };

  await 받(목록길); /* 판을 잡는다 — 쿠키가 있어야 아작스가 답한다 */

  const 방 = path.join(process.cwd(), 'archive', 'raw', 'bigdata-culture', 오늘딱지());
  fs.mkdirSync(방, { recursive: true });
  const 요약 = [];

  for (const 상 of 상자들) {
    const 몸 = (쪽) => new URLSearchParams({
      TP: 상.TP, isMore: 'true', funNm: 상.함수, orderbyCondition: '1',
      srchValue: '', currentPage: String(쪽), pagePerBlock: '5',
      displayId: 상.상자, url: 아작스길,
    }).toString();
    const 첫 = await 받(아작스길, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' }, body: 몸(1) });
    if (!첫) { console.log(`  🔴 ${상.이름.padEnd(10)} 못 받았다`); 요약.push({ 이름: 상.이름, 총: null, 받은: 0, 비고: '못 받았다' }); continue; }
    const { 총건수, 총쪽수 } = 쪽셈(첫);
    const 본것 = new Map();
    const 담기 = (것들) => { for (const x of 것들) if (!본것.has(x.아이디 || x.제목)) 본것.set(x.아이디 || x.제목, x); };
    담기(쪽에서뽑기(첫));
    const 끝쪽 = 총쪽수 || 1;
    for (let p = 2; p <= 끝쪽; p += 1) {
      const h = await 받(아작스길, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' }, body: 몸(p) });
      if (!h) break;
      const 앞 = 본것.size;
      담기(쪽에서뽑기(h));
      if (본것.size === 앞 && p > 2) break; /* 같은 쪽을 계속 돌려준다 — 멈춘다 */
      if (p % 40 === 0) process.stdout.write(`    …${상.이름} ${p}/${끝쪽}쪽 · ${본것.size}건\n`);
      await new Promise((끝) => setTimeout(끝, 180));
    }
    const 것들 = [...본것.values()];
    const 셈 = { 무료: 0, 유료: 0, 협의: 0 };
    for (const x of 것들) if (셈[x.가격] != null) 셈[x.가격] += 1;
    fs.writeFileSync(path.join(방, `${상.딱지}.json`), JSON.stringify({
      갈래: 상.이름, 딱지: 상.딱지, 주소: 밑주소 + 목록길,
      총건수, 받은건수: 것들.length, 가격분포: 셈,
      잰때: new Date().toLocaleString('ko-KR'), 항목: 것들,
    }, null, 1), 'utf8');
    const 몫 = 총건수 ? Math.round(것들.length / 총건수 * 100) : 0;
    console.log(`  ${것들.length ? '✅' : '🔴'} ${상.이름.padEnd(10)} 총 ${총건수 == null ? '못 쟀다' : `${String(총건수).padStart(5)}건`} · 받은 ${String(것들.length).padStart(5)}건 (${몫}%) · 무료 ${셈.무료} · 유료 ${셈.유료} · 협의 ${셈.협의}`);
    요약.push({ 이름: 상.이름, 총: 총건수, 받은: 것들.length, 가격분포: 셈 });
  }
  fs.writeFileSync(path.join(방, '_요약.json'), JSON.stringify({ 잰때: new Date().toLocaleString('ko-KR'), 갈래: 요약 }, null, 1), 'utf8');
  console.log(`\n저장 ${방}`);
}
