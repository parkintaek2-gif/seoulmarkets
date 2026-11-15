import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import { SITE_URL, ADS } from './src/consts';
import { buildFundChart, SWITCH_JS } from './src/lib/fundchart.mjs';

/**
 * ⚠ Sätteri 의 플러그인 API 는 unified/rehype 와 다르다.
 *   rehype:  () => (tree) => { tree.children... }
 *   Sätteri: { name, element: { filter: ['tag'], visit(node, ctx) {...} } }
 *
 * 태그 이름으로 필터링된 노드만 JS 로 넘어오고, 트리 수정은 ctx 의 메서드로 한다
 * (ctx.replaceNode / insertBefore / parent / indexOf ...).
 * rehype 스타일로 쓰면 **아무 일도 일어나지 않고 조용히 넘어간다.** 실제로 그렇게
 * 당했다 — 본문 광고와 표 감싸기가 한동안 안 돌고 있었는데 눈치채지 못했다.
 */

const el = (tagName, properties = {}, children = []) => ({
  type: 'element',
  tagName,
  properties,
  children,
});
const txt = (value) => ({ type: 'text', value: String(value) });

/**
 * 기사 본문 한가운데(중간 h2 앞)에 광고 슬롯을 하나 끼워 넣는다.
 * 마크다운 원문은 건드리지 않는다.
 * 광고 미설정이면 운영 빌드에서는 아무것도 넣지 않고, 개발 중에만 자리를 보여준다.
 */
function inArticleAdPlugin() {
  const configured = ADS.client !== '' && ADS.slots.inArticle !== '';
  const dev = process.env.NODE_ENV !== 'production';

  // 문서마다 h2 를 세야 하므로 팩토리로 만들어 상태를 초기화한다.
  const seen = [];
  let inserted = false;

  return {
    name: 'in-article-ad',
    element: {
      filter: ['h2'],
      visit(node, ctx) {
        if (!configured && !dev) return;
        if (inserted) return;
        // 최상위(본문 바로 아래) h2 만 센다.
        const parent = ctx.parent(node);
        if (!parent || parent.type !== 'root') return;
        seen.push(node);
        // 세 번째 h2 앞에 넣는다. 그보다 짧은 기사에는 넣지 않는다.
        if (seen.length !== 3) return;

        const slot = configured
          ? el('aside', { className: ['ad-slot'], 'aria-label': 'Advertisement' }, [
              /* 🔴🔴 [2026-11-15 · 사장님] 「케이컬쳐와이어 구글 애드센스 광고게재해」
                 애드센스 화면과 함께 코드를 그대로 주셨다 —
                   data-ad-layout="in-article" · data-ad-format="fluid" · text-align:center
                 ⛔ 전에는 인아티클 «단위»에 디스플레이 «코드»(format=auto)를 붙이고 있었다.
                   단위 종류와 코드가 어긋나면 애드센스가 광고를 제대로 주지 않는다 —
                   그동안 네 사이트가 모두 「안채워짐」이었다(scripts/check-ad-fill.mjs).
                 ⚠ 인아티클에는 data-full-width-responsive 를 붙이지 않는다. 주신 코드에 없다. */
              el('ins', {
                className: ['adsbygoogle'],
                style: 'display:block; text-align:center;',
                'data-ad-layout': 'in-article',
                'data-ad-format': 'fluid',
                'data-ad-client': ADS.client,
                'data-ad-slot': ADS.slots.inArticle,
              }),
            ])
          : el('aside', { className: ['ad-slot', 'ad-slot--placeholder'], 'aria-hidden': 'true' }, [
              txt('ad slot — in-article'),
            ]);

        ctx.insertBefore(node, slot);
        inserted = true;
      },
    },
  };
}

/**
 * 데이터 표가 좁은 화면에서 페이지 전체를 가로로 밀어내지 않게
 * 각 표를 가로 스크롤 컨테이너로 감싼다.
 */
function wrapTablesPlugin() {
  return {
    name: 'wrap-tables',
    element: {
      filter: ['table'],
      visit(node, ctx) {
        const parent = ctx.parent(node);
        if (parent && parent.type === 'element' && parent.tagName === 'div') return; // 이미 감싸짐
        ctx.wrapNode(node, el('div', { className: ['table-scroll'] }));
      },
    },
  };
}

/**
 * ```fundchart 코드펜스를 기간 전환되는 펀드 수익률 차트로 바꾼다.
 * 기사 마크다운에는 JSON 만 적으면 되고, SVG 는 빌드 때 만들어진다.
 * JSON 이 깨져 있으면 조용히 넘어가지 않고 빌드를 세운다 — 기사에 빈 자리가
 * 남은 채 발행되는 것보다 낫다.
 */
function fundChartPlugin() {
  return {
    name: 'fund-chart',
    element: {
        filter: ['code'],
        visit(node, ctx) {
          const p = node.properties ?? {};
          const cls = []
            .concat(p.className ?? [])
            .concat(typeof p.class === 'string' ? p.class.split(/\s+/) : []);
          if (!cls.includes('language-fundchart')) return;

          const raw = ctx.textContent(node);
          let spec;
          try {
            spec = JSON.parse(raw);
          } catch (e) {
            throw new Error(`fundchart 블록의 JSON 을 읽지 못했습니다: ${e.message}`);
          }
          if (!Array.isArray(spec.funds) || spec.funds.length === 0) {
            throw new Error('fundchart 블록에 funds 배열이 비어 있습니다.');
          }

          // <code> 의 부모인 <pre> 를 통째로 차트로 갈아끼운다.
          const pre = ctx.parent(node);
          ctx.replaceNode(pre && pre.tagName === 'pre' ? pre : node, buildFundChart(spec));
        },
      },
  };
}

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'never',
  build: { format: 'file' },
  /**
   * 🔴🔴 [2026-10-06 02:4x · 5번] **폴더 주소에 입구가 없었다 — 8곳이 404 였다.**
   *
   * 네 사이트를 다 재 보니 입구 없는 폴더가 18곳이고, 그 가운데 여기가 8곳이다 —
   * ```
   * /japan 3,736장 · /japan/company 3,702 · /company 2,521 · /taiwan 1,090
   * /taiwan/company 1,057 · /uae 105 · /uae/company 104 · /sector 60
   * ```
   * 손님이 `seoulmarkets.com/japan` 을 치면 404 를 봤다. 묶음에 「무엇이 있나」를
   * 볼 자리가 없으니 안쪽 링크가 평평해지고 권위가 한 곳에 모이지 않는다.
   *
   * ⛔ **새 목록 지면을 만들지 않는다.** `/japan/companies` 와 `/companies` 가
   *   이미 그 일을 한다 — 또 만들면 같은 말을 하는 지면이 둘이 되고, 구글이
   *   그것을 겹친 지면으로 본다. 길이 없는 것이지 지면이 없는 것이 아니다.
   * ⚠ 정적 빌드라 meta refresh 로 나간다. 서버 301 보다 약하므로 **배포 뒤
   *   라이브에서 눌러 보고** 200 이 나오는지 잰다. 「설정했다」로 끝내지 않는다.
   */
  redirects: {
    '/japan': '/japan/companies',
    '/japan/company': '/japan/companies',
    '/taiwan': '/taiwan/companies',
    '/taiwan/company': '/taiwan/companies',
    '/uae': '/uae/companies',
    '/uae/company': '/uae/companies',
    '/company': '/companies',
    /* ⚠ 업종 목록은 `/companies` 안에 61갈래로 들어 있다 — 따로 두지 않는다 */
    '/sector': '/companies',
    /* 🔴 [2026-10-06 03:1x] 자가 내 손보다 깊이 봐서 둘을 더 찾았다 —
       나라별 업종 목록도 그 나라 `companies` 지면 안에 들어 있다 */
    '/japan/sector': '/japan/companies',
    '/taiwan/sector': '/taiwan/companies',
  },
  markdown: {
    // 구문강조를 끈다. 이 사이트에 코드블록은 쓸 일이 없고, 켜두면 Shiki 가 먼저 돌면서
    // ```fundchart 의 language- 클래스를 먹어버려 아래 플러그인이 블록을 못 찾는다.
    syntaxHighlight: false,
    processor: satteri({
      // 팩토리로 넘긴다 — 문서마다 클로저 상태(h2 카운트 등)가 초기화되어야 한다.
      /* 🔴🔴 [2026-11-15 · 사장님] 「**광고는 케이컬쳐만 승인 받은. 거기에만 광고 넣어. 더하지마**」
         ⇒ `inArticleAdPlugin` 을 **뺐다.** 이 플러그인은 마크다운 단계에서 돌아
           **어느 사이트의 글인지 모른다** — 네 사이트 기사에 모두 광고가 들어갔다.
           케이컬처와이어 기사 틀(`pages/wikitip/article/[...id].astro`)에서
           `<AdSlot slot="inArticle" />` 로 직접 넣는다. 거기서는 사이트가 분명하다.
         ⚠ 함수는 지우지 않고 남겨 둔다 — 다른 사이트가 승인되면 다시 쓸 수 있다.
           ⛔ 다시 켤 때는 «어느 사이트인지 가릴 수 있나»부터 푼다. */
      hastPlugins: [fundChartPlugin, wrapTablesPlugin],
    }),
  },
});
