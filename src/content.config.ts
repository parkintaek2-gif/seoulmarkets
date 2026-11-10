import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
/* 🔴 2026-10-26 사장님 지시로 신설된 리뷰 서비스. 분류와 사진 규칙의 정본은 아래 두 파일이다 */
import fs from 'node:fs';
import { 분류코드 } from './lib/리뷰분류.mjs';
import { 사진위반, 사진파일없나 } from './lib/리뷰사진규칙.mjs';

/**
 * 기사 frontmatter 스키마.
 * 기사 생성 스킬은 이 필드들을 채워서 /content/articles/{slug}.md 로 저장하면 된다.
 * 필드가 빠지면 빌드가 실패한다 — 의도한 것이다. 출처 없는 기사를 막는 장치다.
 */
const source = z.object({
  /** 데이터를 발표한 기관. 예: 'Financial Services Commission (Korea)' */
  org: z.string(),
  /** 구체적 데이터셋/API 이름. 예: 'Stock Price Information Open API' */
  api: z.string(),
  /** 출처 URL (선택) */
  url: z.string().url().optional(),
});

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/articles' }),
  schema: z.object({
    title: z.string().max(120),
    /** 카드·기사 상단에 한 줄로 붙는 부제 */
    dek: z.string().max(240),
    category: z.enum(['equities', 'fx', 'rates', 'commodities', 'funds', 'macro']),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    /**
     * 데이터 기준시각. 공공데이터포털 시세는 T+1이므로
     * 발행일과 다른 것이 정상이다. ISO8601 + 타임존 표기를 권장.
     */
    dataAsOf: z.coerce.date(),
    /** 최소 1건 — 출처 없는 기사는 발행하지 않는다 */
    sources: z.array(source).min(1),
    /** 교차검증한 항목 */
    crossChecks: z.array(z.string()).default([]),
    /** 확인이 안 돼 기사에서 뺀 수치 */
    excluded: z.array(z.string()).default([]),
    /**
     * ⭐ **정정 기록.** 낸 뒤에 숫자가 바뀌면 **조용히 고치지 않는다.**
     *
     * 우리가 파는 것은 숫자의 신뢰다. 신뢰는 「틀린 적 없다」로 생기지 않는다 —
     * 아무도 그걸 안 믿는다. **틀렸을 때 어떻게 하는지**로 생긴다.
     * 고친 자국이 남아 있는 표가, 자국이 없는 표보다 믿을 만하다.
     *
     * 2026-08-05 에 처음 필요해졌다 — 직원 수 집계 버그로 이미 낸 기사 셋의
     * 숫자가 바뀌었다. 그때 **적을 자리가 없다는 걸 알았다.**
     */
    corrections: z.array(z.object({
      date: z.coerce.date(),
      /** 무엇이 어떻게 바뀌었나. 「수정함」 같은 말로 때우지 않는다 */
      note: z.string(),
    })).default([]),
    /** 언급 종목 코드 (선택) */
    tickers: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    author: z.string().default('Newsroom'),
    /** OG 이미지 경로 (/public 기준). 없으면 자동 생성 카드 사용 */
    image: z.string().optional(),
    /** true 면 빌드에서 제외 */
    draft: z.boolean().default(false),
  }),
});

/**
 * K Culture Wire 기사. (`content/kculturewire/` · 지면 `/article/<slug>`)
 *
 * ── 왜 위 `articles` 를 같이 안 쓰나 ───────────────────────────
 * `articles` 는 **SeoulMarkets 전용**이다 — category enum 이 금융 축(equities·fx·
 * rates·commodities·funds·macro)이고, 라우트가 `Base.astro`(금융 머리말)에
 * `SITE_URL`(seoulmarkets.com)로 붙는다. K컬처 기사를 거기 넣으면 카테고리가 안 맞고
 * **금융 매체 얼굴로 나간다.** `WikiTip.astro` 를 따로 뗀 것과 같은 이유다.
 *
 * ── 왜 기사가 필요한가 (사장님 지시 2026-08-05 11:30) ──────────
 * 「네가 할 일은 **영어뉴스+데이터가공**이다」 — 지면 7장은 데이터 지면이지 기사가 아니다.
 * 2026-08-06 에 세어 보니 K Culture Wire 기사가 **0편**이었다. 앞 절반을 안 하고 있었다.
 *
 * ── 스키마는 위 `articles` 와 일부러 같은 뼈대다 ────────────────
 * sources·crossChecks·excluded·corrections 를 그대로 가져왔다. **출처 없는 기사를
 * 막는 장치**이고, 두 매체가 같은 규율을 쓰는 편이 낫다. category 만 K컬처 축이다.
 */
const kcwArticles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/kculturewire' }),
  schema: z.object({
    title: z.string().max(120),
    dek: z.string().max(240),
    /**
     * K컬처 1층 갈래. 금융 축과 섞지 않는다.
     * 🔴 2026-08-10 사장님 — 「기존 카테고리는 촌스럽다. **스타·작품·전통문화·산업**으로 하라」
     *   `screen`·`people` 은 **우리끼리 쓰던 말**이었다. 손님이 찾을 때 쓰는 말로 바꾼다.
     * ⛔ `tradition` 은 **하위가 없다**(사장님 못 박으심). 아래 `genre` 를 붙이지 않는다.
     */
    category: z.enum(['stars', 'titles', 'industry', 'tradition']),
    /**
     * 2층 — 대중문화 갈래. **없어도 된다.**
     * ⚠ 우리 넷플릭스 기사 서른 편은 **영화와 드라마를 같이 잰다.** 한쪽에 넣으면 거짓이 된다.
     *   그런 편은 2층 없이 1층에만 선다. 억지로 채우지 않는다.
     */
    genre: z.enum(['music', 'drama', 'film', 'esports']).optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    dataAsOf: z.coerce.date(),
    sources: z.array(source).min(1),
    crossChecks: z.array(z.string()).default([]),
    excluded: z.array(z.string()).default([]),
    corrections: z.array(z.object({
      date: z.coerce.date(),
      note: z.string(),
    })).default([]),
    tags: z.array(z.string()).default([]),
    /**
     * 이 기사가 쓴 **지면 주소**들. 지면이 이걸 보고 스스로 기사를 건다.
     *
     * ⚠ 관계를 **지면이 아니라 기사에** 둔다. 지면에 손으로 걸면 다음 기사를 쓸 때 빠진다 —
     *   2026-08-07 에 실제로 12편 중 7편이 아무 지면에도 안 걸려 있었다.
     *   기사를 쓰는 사람은 자기가 어느 자료를 썼는지 알고, 지면은 그걸 읽기만 하면 된다.
     *   그러면 기사를 내는 순간 지면에 저절로 걸린다.
     *
     * ⛔ 빈 배열도 뜻이 있다 — 「어느 지면 자료도 안 썼다」다. 억지로 채우지 않는다.
     */
    pages: z.array(z.string()).default([]),
    author: z.string().default('Newsroom'),
    draft: z.boolean().default(false),
    /**
     * "[VS News]" 코너 — 사장님 지시(2026-09-14): 「[VS 뉴스] 코너명으로... 투표할 수
     * 있는 걸 만들어줘야지... 집계도 실시간으로」. 자체 투표 위젯(vote-widget.js →
     * /api/vote → src/lib/votes.mjs)을 이 기사에 붙일지·무엇으로 붙일지를 여기서 정한다.
     * ⛔ 없어도 된다 — 모든 기사가 VS 뉴스는 아니다.
     */
    vote: z.object({
      poll: z.string(),
      choices: z.array(z.object({ id: z.string(), label: z.string() })).min(2),
    }).optional(),
  }),
});

/**
 * ⭐ **K Culture Wire 리뷰 — 한국어.** (`content/kcw-reviews/**.md` → `/ko/review/<slug>`)
 *
 * ── 🔴🔴 사장님 지시 (2026-10-26, 원문) ───────────────────────────────
 * 「스포츠경기, 드라마, 예능 등 TV,OTT 프로그램 **리뷰로 콘셉트를 바꾸자.**
 *   케이컬쳐와이어를 **한국어와 영어로** 서비스하자... K-POP은 계속 서비스한다...
 *   **모든 카테고리에 기사 한 건을 매일 쓸 필요는 없다.**
 *   ...**영어 서비스는 케이컬쳐리뷰 본래의 스타를 다루는 내용만 써라.**」
 *
 * 「리뷰는 1. **방송이면 최근회차 내용, OTT면 공개된 회차 내용, K-POP이면 최근 공연,
 *   음원** 2. **스포츠는 당일 경기 내용과 결과, 다음 경기 일정 포함** 등을 중심으로 함.
 *   리뷰라고 꼭 비평일 필요는 없다. **오히려 네티즌들의 댓글을 리뷰로 사용하도록 해라.**」
 *
 * ── ⛔ `kcwArticles` 에 통합하지 않은 이유 ────────────────────────────
 * 그쪽은 **측정한 수치로 작성하는 데이터 기사**다. `dataAsOf`·`sources` 가 필수이고,
 * 「이 수치를 어디서 측정했나」가 지면에 전개된다. 리뷰는 **관찰한 내용을 기록하는 글**로
 * 성격이 다르다. 단일 스키마에 수용하면 둘 중 하나의 규칙이 반드시 완화된다 —
 * 완화되는 쪽은 언제나 수치 쪽이다.
 *
 * ⛔ 영어 리뷰를 본 컬렉션에 수용하지 않는다. 사장님이 **영어는 스타 한정**으로 명시하셨다.
 *   영어는 종전대로 `kcwArticles` 를 사용한다.
 */
const kcwReviews = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/kcw-reviews' }),
  schema: z.object({
    title: z.string().max(120),
    /** 카드·리뷰 상단에 1행으로 부기하는 부제 */
    dek: z.string().max(240),
    /** 분류 목록. ⛔ 정본은 `src/lib/리뷰분류.mjs` 단일 파일이다 */
    category: z.enum(분류코드 as [string, ...string[]]),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    /**
     * **리뷰 대상.** 리뷰에는 반드시 대상이 있다 — 경기 1건, 드라마 1개 회차.
     * ⛔ 대상 없이 작성하면 그것은 리뷰가 아니라 일반 기고문이다.
     */
    subject: z.object({
      /** 경기·회차·작품 명칭. 예: '2026 롤드컵 스위스 3라운드 한화생명-IG' */
      명칭: z.string(),
      /**
       * match 경기 · episode 회차 · season 시즌 전체 · release 음반·영화 ·
       * channel 채널번호와 편성표
       *
       * 🔴 [2026-11-10] `channel` 은 대상이 «경기나 회차가 아닌» 유일한 유형이다.
       *   채널 1개 또는 프로그램 1개의 번호·시간을 모아 놓은 화면이라,
       *   반응·사진·다음일정이 없을 수 있다.
       */
      유형: z.enum(['match', 'episode', 'season', 'release', 'channel']),
      /**
       * 개최·방영 일시(한국시간). 발행일과 상이한 것이 정상이다.
       * `channel` 에서는 **그 번호·편성표를 확인한 날**을 적는다.
       */
      일시: z.coerce.date(),
      /** 개최·방영 주체 — 리그·방송사·OTT 명칭. 예: 'LoL 이스포츠', 'tvN', '넷플릭스' */
      주체: z.string(),
    }),
    /**
     * 🔴 [2026-10-26 · 사장님 지시] 「**스포츠는 당일 경기 내용과 결과, 다음 경기 일정 포함**
     *   등을 중심으로 함」
     * ⚠ 생략 가능하다 — 대회가 종료됐으면 다음 경기가 «없는» 것이 사실이다. 임의로 채우지 않는다.
     *   방송·OTT 에서는 차회 방영 일정을 기재하는 항목으로 사용한다.
     */
    다음일정: z.object({
      명칭: z.string(),
      일시: z.coerce.date(),
      주체: z.string(),
    }).optional(),
    /**
     * 🔴🔴 [2026-10-26 · 사장님 지시, 원문] 「**리뷰라고 꼭 비평일 필요는 없다.
     *   오히려 네티즌들의 댓글을 리뷰로 사용하도록 해라.**」
     *
     * ⇒ 당사가 평점을 부여하는 대신 **이용자들이 실제로 작성한 문장**을 전재한다.
     *   강령과도 부합한다 — 「우리가 바늘을 세우지 않는다. 지형을 그려 놓고,
     *   바늘은 보는 사람이 세운다.」
     *
     * ⛔⛔ **창작하지 않는다.** 1건이라도 창작하면 해당 지면의 나머지 전부가 불신된다.
     *   따라서 댓글마다 **원 소재지 주소**를 필수로 부기한다 — 주소가 없는 댓글은
     *   빌드가 중단시킨다. 「대체로 그런 반응이었다」 같은 포괄적 서술도 사용하지 않는다.
     * ⛔ 작성자 계정명을 기재하지 않는다. 전재 대상은 «문장»이지 개인이 아니다.
     */
    반응: z.array(z.object({
      /** 댓글 원문. ⛔ 윤문·수정하지 않는다 — 수정하면 그 사람의 문장이 아니게 된다 */
      내용: z.string().min(1),
      /** 어느 지면의 문장인가. 예: '인벤 LoL 게시판', '유튜브 LCK 중계' */
      출처: z.string().min(1),
      /** 해당 문장이 실재하는 주소. ⛔ 없으면 전재하지 않는다 */
      주소: z.string().url(),
      일시: z.coerce.date().optional(),
    })).default([]),
    /**
     * 🔴 **사진.** 규칙은 `src/lib/리뷰사진규칙.mjs` 가 검증한다 — 위반 시 빌드가 중단된다.
     * ⚠ `src` 는 내려받아 자체 서버(`public/review/`)에 보관한 경로여야 한다. 외부 서버를
     *   직접 참조하면 일방적으로 중단될 수 있고, 해당 서버에 당사 방문자만큼 부하를 전가한다.
     */
    image: z.object({
      src: z.string(),
      대체텍스트: z.string(),
      캡션: z.string(),
      /** 캡션 말미에 「/ 라이엇 게임즈」 형태로 부기하는 명칭 */
      제공처: z.string(),
      제공처유형: z.enum(['team', 'league', 'broadcaster', 'ott', 'agency', 'own']),
      /** 원 소재지. ⛔ 내려받았다고 출처가 당사가 되지 않는다 */
      출처주소: z.string(),
    }).optional(),
    /**
     * 🔴 [2026-10-26 · 사장님 지시] 「**케이컬쳐와이어에서 보도자료를 잘 활용해라**」
     *
     * 이 리뷰가 사용한 **공식 보도자료**. 창구 목록은 `src/lib/보도자료창구.mjs` 에 있다.
     * ⭐ 보도자료는 두 가지를 동시에 해결한다 — 사실을 발표 주체에게서 직접 받고,
     *   사장님 사진 규칙이 요구하는 «제공처가 명시된 사진»이 거기에 붙어 나온다.
     * ⛔ 보도자료 문장을 그대로 옮기지 않는다. 그것은 발표 주체의 말이다 —
     *   우리가 관찰한 것과 그들이 발표한 것을 본문에서 구분해 기재한다.
     * ⛔ 사용하지 않은 보도자료를 실적처럼 나열하지 않는다.
     */
    보도자료: z.array(z.object({
      제목: z.string().min(1),
      발표처: z.string().min(1),
      주소: z.string().url(),
      일시: z.coerce.date().optional(),
    })).default([]),
    /** 수치를 인용한 리뷰는 출처를 기재한다. ⛔ 수치를 쓰지 않은 리뷰에 임의로 채우지 않는다 */
    sources: z.array(source).default([]),
    corrections: z.array(z.object({
      date: z.coerce.date(),
      note: z.string(),
    })).default([]),
    tags: z.array(z.string()).default([]),
    author: z.string().default('K Culture Wire'),
    draft: z.boolean().default(false),
  }).superRefine((d, ctx) => {
    /* 🔴 사장님 사진 규칙을 **이 지점에서 차단한다.** 경고로 출력하면 아무도 확인하지 않는다 */
    for (const 항목 of 사진위반(d)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['image'], message: 항목 });
    }
    /* 🔴 [2026-10-26] 첫 리뷰를 배포하고 보니 지면은 200 인데 **사진만 404** 였다.
       규칙은 다 통과했는데 «파일이 그 자리에 있는지»는 아무도 안 봤다. 여기서 본다. */
    const 파일흠 = 사진파일없나(d, (자리) => fs.existsSync(자리));
    if (파일흠) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['image'], message: 파일흠 });
  }),
});

export const collections = { articles, kcwArticles, kcwReviews };
