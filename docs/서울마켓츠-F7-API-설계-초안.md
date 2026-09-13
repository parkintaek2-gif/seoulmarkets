# F7 — Korea Screener API 설계 초안 (2번, 1차본)

작성 2026-09-10 18:2x · 2번 · 목표일 10-03 · 담당 1번·2번·6번
왜 지금 쓰나: 5번(총괄) 16:38·17:25 물음 — 2번 자리가 9/21 없어지므로 F7을 이어받을
5번께 「설계·열쇠 발급 방식·문서 초안」을 파일로 넘겨야 한다. 지금까지 아무것도 없었다
(src/pages/api 자체가 저장소에 없다). 이 문서가 그 첫 판이다 — 완성본이 아니라 시작점이다.

---

## 0. 🔴 먼저 확인한 것 — 지금 구조로는 «진짜 동적 API»가 안 선다

```
astro.config.mjs 에 output·adapter 설정이 없다 ⇒ dataeconomics 는 «정적 빌드»다.
정적 빌드는 요청마다 코드를 실행할 수 없다 — 열쇠 검사·요율제한·월간 쿼터 같은
「요청마다 다르게 답한다」가 정적 파일로는 안 된다.
```

⇒ 선택지는 둘이다. **판정은 이 문서가 아니라 5번·6번 몫으로 넘긴다.**

```
A) klifemap 처럼 작은 Node 서버를 새로 둔다(별도 배포 대상)
   klifemap/apiBusiness.js 에 이미 «완성돼 도는» 패턴이 있다 — 그대로 베낀다:
     - 헤더는 x-api-key 가 아니라 다른 이름을 쓴다(예: x-sm-key). 까닭은 apiBusiness.js
       209~212줄 그대로다 — x-api-key 는 화면 소스에 그대로 노출되는 값이라
       유료 API 열쇠로 쓰면 누구나 공짜로 쓴다.
     - 열쇠별 rate limit(분당) + 월간 쿼터 + status(active/…) 확인
     - DB.findApiClientByKey 자리는 처음엔 파일(JSON) 하나로 시작해도 된다 — 손님이
       몇 명 안 될 때 DB부터 만드는 것은 이르다
B) Cloudtype 서버리스 함수 몇 개만 추가한다(Astro 프로젝트는 그대로 정적으로 두고)
   ⬜ Cloudtype 이 이 조합(정적 사이트 + 서버리스 함수)을 지원하는지 아직 안 알아봤다
```

⭐ 어느 쪽이든 **판별 로직(열쇠 확인·쿼터)은 klifemap 걸 그대로 재사용**하면 된다 —
  이미 만들어서 돌고 있는 것을 다시 짓지 않는다(「같은 일을 하는 자를 먼저 열어본다」).

---

## 1. 제공할 것 — 지금 있는 데이터 상품을 그대로 매핑

```
GET /api/v1/financials/accounts     src/data/korea-financial-account-english.json (F3, 405개)
GET /api/v1/valuation                src/data/korea-valuation-tape.json (F2, 2,709줄)
GET /api/v1/index-tape                src/data/korea-index-tape.json (F4, 168줄)
GET /api/v1/ownership                 Korea Ownership Ledger (5%룰 대량보유)
GET /api/v1/mezzanine                 Korea Mezzanine Book (CB·BW·EB)
GET /api/v1/people                    Korea People Panel (근속·급여, 곁들이)
GET /api/v1/trade                     Korea Trade Revision Tape
```

⛔ 이 목록은 **파일이 이미 있는 것만** 적었다 — 아직 없는 상품(펀드 기준가 등)은 안 넣었다.
⬜ 화면(/data/*)과 API의 응답 모양을 같게 할지, API 전용 스키마를 따로 둘지는 못 정했다.
  ⭐ 제안: 같게 간다 — 화면이 이미 「분모 먼저·못 잰 것은 null」 규율을 지키고 있어서,
    API가 다른 모양이면 그 규율을 두 번 짜야 한다.

---

## 2. 인증·요율 — klifemap 패턴을 그대로 옮긴 안 (제안, 확정 아님)

```
헤더        x-sm-key: <열쇠>
발급        처음엔 수동 — 신청 오면 5번(또는 이어받는 사람)이 열쇠를 만들어
            docs/서울마켓츠-api-클라이언트.json(가칭)에 한 줄 추가. 자동가입 화면은 나중.
요율        분당 N회 (숫자 미정 — 손님이 없어서 정할 근거가 아직 없다. ⬜)
쿼터        월간 M회 무료 티어 (숫자 미정. ⬜ — FnGuide 등 경쟁 상품 가격표를 먼저 봐야 한다)
실패 응답   { ok:false, error:'missing_key'|'invalid_key'|'rate_limited'|'quota_exceeded', message }
            (klifemap apiBusiness.js 그대로 — 「왜 안 되는지 모르겠다」 문의를 줄인다)
```

---

## 3. 문서 — 아직 없다

```
⬜ OpenAPI(swagger) 명세 — 안 씀
⬜ 사람이 읽는 API 문서 페이지(/api-docs 류) — 안 씀
⬜ 예시 요청(curl) — 안 씀
```

---

## 4. 다음 사람(5번 또는 이어받는 분)이 바로 할 수 있는 것

```
1  0절의 A/B 선택 — 6번(서버·배포를 제일 많이 만져 본 유닛)과 상의해서 정한다
2  A 를 고르면 klifemap/apiBusiness.js 를 그대로 복사해 헤더 이름만 바꾼다
   (findApiClientByKey 의 DB 자리를 파일 읽기로 바꾸면 하루 안에 된다)
3  1절 엔드포인트 7개 중 하나(예: index-tape, 제일 작다)로 먼저 끝까지 뚫어 본다
   ⛔ 일곱 개를 한 번에 만들지 않는다 — 하나가 되면 나머지는 같은 틀이다
```

---

## ⬜ 정직하게 남기는 것

이 문서를 쓴 사람(2번)은 서버 배포·인증 인프라를 실제로 만들어 본 적이 아직 없다
(F1~F4는 전부 정적 파일 빌더였다). 그래서 0절의 A/B 판단과 요율·쿼터 숫자는 **짐작이지
실측이 아니다** — 확정하지 말고 6번·5번이 다시 봐 주시기를 부탁드린다.

---

## 🔴 [2026-09-12 21:xx · 6번] 0절 A/B 판단 — **이미 A 로 서 있다. 새로 고를 게 없다**

지시(21:01 업무분장): 「① A/B 판단 — 6번 — 지금 구조로 동적 API 가 서나」에 답한다.
**히스토리부터 봤다** — 이 문서가 말한 「정적 빌드라 동적 API가 안 선다」는 절반만 맞다.

```
✅ Astro 자체는 정적 빌드다(astro.config.mjs 에 output·adapter 없음) — 이 부분은 맞다
✅ 그런데 seoulmarkets 는 Astro 를 «그대로» 배포하지 않는다.
   package.json start = `node server.mjs` — dist/ 를 서비스하는 «진짜 Node 서버»가 이미 돈다
   (.cloudtype/app.yaml 도 이렇게 명시: 「Astro 정적 빌드 결과를 server.mjs 가 서비스」)
⇒ server.mjs → src/lib/api.mjs 의 handleApi() 가 **요청마다** 실행된다.
   그 안에서 이미 되고 있는 것:
   - tierOf(ctx.headers) · rateCheck(ctx.ip, tier)  — 분당 요율(무료 60/분), 429 시행
     (src/lib/tiers.mjs, 사장님 지시 2026-08-03 「RapidAPI 유료화」)
   - POST /v1/keys — 셀프 발급 API 열쇠(X-Api-Key 헤더). 2026-09-09 · 1번이 이미 만듦
   - meter() 로 라우트별 사용량 집계
```

**즉 A(작은 Node 서버를 새로 둔다)는 이미 구현돼 있다 — 「새로 두는」게 아니라 «이미 있다».**
B(Cloudtype 서버리스 함수)는 알아볼 필요가 없어졌다. **판단 끝.**

⚠ 헤더 이름은 초안의 `x-sm-key` 가 아니라 **`X-Api-Key`** 로 이미 굳어 있다(1번이 그렇게 냈다).
  F7 문서·예제(1번 몫)를 쓸 때 이 이름을 따른다 — 초안의 `x-sm-key`는 되살리지 않는다.

### ③ 엔드포인트 — index-tape 는 **이미 살아 있었다.** 오늘은 «최신화 + 재검증»만 했다

`/v1/index-tape` 는 2026-09-10 에 2번이 이미 뚫어 배포까지 끝냈다(핸들러 `src/lib/api.mjs:658`).
오늘 확인해 보니 자료가 09-09 시세로 멈춰 있었다 — 09-10 자료가 아카이브에 들어와 있는데
빌드가 안 돌아간 것이다. `node scripts/build-korea-index-tape.mjs --적는다` 로 다시 만들고
`ctype apply -f .cloudtype/app.yaml -t @parkintaek2/seoulmarkets:main` 로 배포, **실측으로
확인했다** — `curl https://seoulmarkets.com/v1/index-tape?name=KOSPI%20200` → `date: 20260910`.

⛔ **「엔드포인트가 있다」와 「최신 자료로 서고 있다」는 다른 것이다.** 다음 사람은 매번
   재실측하지 말고, `build-korea-index-tape.mjs` 를 아카이브 새 판이 들어올 때마다 자동으로
   불러 주는 고리(cron 혹은 check-archive-freshness 같은 감시)가 없다는 것부터 안다.

### 남은 넷(F7 엔드포인트 7개 중) — **ownership·mezzanine·people 은 「같은 틀」이 안 통한다**

초안 1절이 「파일이 이미 있다」고 적은 세 상품을 실측했다 — **행(row) 단위 자료가 아니다.**

```
seoulmarkets-ownership.json    rows 없음 — 요약 통계(builtOn·filings·byForm·busiest 상위 목록뿐)
seoulmarkets-mezzanine.json    rows: 5084  ← «배열»이 아니라 «건수(숫자)»다. 실제 행 자료가 없다
seoulmarkets-people.json       위와 같다. rows 가 숫자다
```

이 셋은 `/data/ownership` 같은 **화면(집계 리포트)용으로 만든 파일**이다. index-tape·valuation·
account-dictionary 처럼 `?ticker=`로 필터링할 행 배열이 없어서, 지금 그대로 라우트만 추가하면
「집계 숫자 하나」를 돌려주는 장식 엔드포인트가 된다 — **팔 수 있는 API 가 아니다.**

⛔ 그래서 오늘 이 셋을 「하나 되면 나머지는 같은 틀」로 밀어붙이지 않았다. 밀었으면
   숫자로 확인 안 하고 「뚫었다」고 보고할 뻔했다. **못 쟀으면 못 쟀다고 적는다.**
⬜ 다음 손댈 사람에게 남기는 선택지 — 행 단위 원자료(DART 개별 공시)부터 다시 뽑거나,
   아니면 이 셋은 API 목록에서 빼고 화면 전용으로 못박는다. **결정은 안 했다.**

### 🔴 [2026-09-13 · 6번] 위 판정 정정 — «집계본만 보고 없다고 했다». **행 단위 원자료는 이미 있었다**

5번이 23:29 감수에서 잡았다(docs/세션간-메모.md) — `seoulmarkets-*.json` 은 화면용 집계본이
맞지만, 그 옆에 **행 단위 원자료가 이미 있다**(`builtFrom` 칸이 스스로 적어 두고 있었다).

```
src/data/full/korea-people-panel-2026-09-11.csv          2,923행 (사람)
src/data/full/korea-mezzanine-book-2026-09-11.csv         5,563행 (메자닌)
src/data/full/korea-ownership-ledger-*.csv (2개) + archive/raw/dart-ownership/ownership.ndjson (16MB)
```

순서(5번 지정) — **people → mezzanine → ownership.** people 이 가장 작고 만만하다.

#### ✅ people — 오늘 뚫었다. 살아 있다

```
scripts/build-korea-people-tape.mjs --적는다   src/data/full/korea-people-panel-*.csv
  → src/data/korea-people-tape.json (행 2,924개, index-tape 와 같은 꼴 — _meta + rows)
src/lib/api.mjs      GET /v1/people  (?ticker= 단건, ?market=·?name= 필터, ?limit=)
src/lib/openapi.mjs  /people 명세 추가 — 명세에 없으면 안 팔린다(강령)
```

⛔ **women_share·근속비·급여비는 API 에서 퍼센트로 바꾸지 않았다** — 원본 그대로 0~1 비율이다.
  무료 지면(`build-seoulmarkets-people-page.mjs`)은 퍼센트로 한 번 곱해 내지만, 그건 그 지면의
  목적(분포 그래프)에 맞춘 가공이고 API 는 **원자료 그대로**가 원칙이다(강령 ③). 필드 이름에
  `_ratio`를 박아 손님이 다시 안 헷갈리게 했다.

⬜ **mezzanine·ownership 은 아직 안 뚫었다.** mezzanine(5,563행·1.1MB)이 다음이고,
  ownership(4MB×2 + ndjson 16MB)은 통째로 메모리에 올리지 않고 쪽(page)으로 잘라야 한다
  — 5번이 이미 이렇게 지정해 뒀다. 다음 사람은 이 문서 위쪽 「같은 틀이 안 통한다」 판정을
  «집계본에 한해서만» 맞는 말로 읽는다. 원자료 기준으로는 셋 다 뚫린다.

#### ✅ mezzanine — 오늘(같은 세션) 이어서 뚫었다. 살아 있다

```
scripts/build-korea-mezzanine-tape.mjs --적는다   src/data/full/korea-mezzanine-book-*.csv
  → src/data/korea-mezzanine-tape.json (행 5,084개 — 파싱하면 5,563 «naive 줄»보다 준다.
    칸 안 줄바꿈이 있는 필드가 있어서다. people-page 스크립트가 이미 겪은 현상 그대로)
src/lib/api.mjs      GET /v1/mezzanine  (?filing_id= 단건, ?ticker=·?type=CB|BW|EB·?name= 필터)
src/lib/openapi.mjs  /mezzanine 명세 추가
```

⛔ **EB 의 `refix_floor_price_krw` 를 0 이나 「못 쟀다」로 뭉개지 않았다** — `refix_floor_note`
가 EB 428건 전부에 「해당 없음」 이유를 달고 있어서(원자료 자체가 그렇게 적혀 있다), 값과
까닭 두 칸을 그대로 따로 낸다. 실측: EB 필터 결과 428건, 값이 있는 EB 는 0건, note 는 428건
전부 있음 — 정확히 겹친다.

⬜ **ownership 은 아직이다.** 원자료가 커서(4MB×2 CSV + 16MB ndjson) people·mezzanine 처럼
  JSON 모듈로 통째로 번들에 실으면 안 된다 — 스트리밍·페이지 자름이 필요하다. 다음 손댈
  사람은 이 셋 중 «가장 큰 것»을 마지막에 맡는다는 순서(5번 지정)를 그대로 따른다.

### ✅ ownership — [2026-09-13 · 6번] 뚫었다. F7 일곱 엔드포인트가 이제 다 살아 있다

```
scripts/build-korea-ownership-tape.mjs --적는다
  → src/data/korea-ownership-filings-tape.json     (대량보유 majorstock, 21,785행 · 10.3MB)
  → src/data/korea-ownership-executives-tape.json  (임원·주요주주 elestock, 32,535행 · 12.6MB)
src/lib/api.mjs   GET /v1/ownership  (?kind=filings|executives, 기본 filings · ?ticker=·?name=·?filing_id=·?limit=)
src/lib/openapi.mjs   /ownership 명세 추가
```

⛔ **두 표를 한 표로 합치지 않았다** — build-seoulmarkets-ownership-ledger.mjs 가 이미
  「원자료 모양이 다르다」고 정한 결정을 그대로 물려받았다. people·mezzanine 은 «한 표 한 API»
  였지만 ownership 은 **«한 API·kind 로 표 둘»**이다. 강제로 합쳤으면 holder_name·person_name·
  title·relationship 같은 칸이 서로 안 맞아 null 투성이가 됐을 것이다.

⚠ **번들 크기 — 23MB 를 그대로 실었다.** 5번이 「통째로 메모리에 올리지 말고 페이지로 자르라」고
  적어 둔 우려는 «4MB×2 CSV + 16MB ndjson 전부»를 두고 한 말이었다. 실제로 쓴 것은 이미
  정제된 CSV(src/data/full, ndjson 은 안 씀)이고, people(1.9MB)·mezzanine(3.5MB) 을 합쳐도
  기존 번들이 23MB 였던 것과 견주면 46MB 는 0.5GB 예산의 ~9%다. **응답은 이미 limit(기본 50,
  등급별 상한)으로 잘려 나간다** — 메모리에 있는 것과 손님에게 나가는 것은 다르다.
  다만 **실측은 안 했다** — 배포 뒤 실제 컨테이너 RSS 를 봐야 「괜찮다」가 확정된다.

F7 일곱(financials/accounts=account-dictionary · valuation · index-tape · ownership · mezzanine
· people · trade)이 이제 다 라우트로 있다. 남은 것은 ①문서·예제(1번)·②데이터품질(3번)·
③총괄감수(5번)뿐이다.
