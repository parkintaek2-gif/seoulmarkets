import type { APIRoute } from 'astro';

/**
 * K Culture Wire robots.txt.
 * server.mjs 가 www.kculturewire.com/robots.txt → dist/wikitip/robots.txt 로 보낸다.
 * 크롤러를 막지 않는다 — 검색 유입이 유일한 마케팅이다. 색인 여부는 각 페이지 robots 메타태그가 정한다.
 * `Sitemap:` 줄이 크롤러가 사이트맵을 찾는 자리다.
 *
 * 🔴 2026-08-15 — **RSS 를 여기서 안 알리고 있었다.** `/rss.xml` 은 88편을 다 담고
 *   200 으로 살아 있는데, 그것을 가리키는 줄이 없어 뉴스 수집기·구독기가 찾을 길이 없었다.
 *   ⛔ 만들어 놓고 문을 안 낸 것 — 카드뉴스·숏영상에서 이미 두 번 겪은 그 일이다.
 *   ⚠ `Sitemap:` 은 표준 지시어지만 RSS 는 아니다. 주석으로 적어 사람과 수집기 둘 다 보게 한다.
 */
export const GET: APIRoute = () =>
  new Response(
    `# K Culture Wire — Korean pop culture, in numbers.
# Search traffic is our only marketing, so we block no crawler.
# Indexing is decided per page by the robots meta tag.
User-agent: *
Allow: /

# ── AI answer engines ─────────────────────────────────────────
# [2026-11-09] The wildcard above already allows these. They are named anyway,
# because some crawlers look for their own section first and behave conservatively
# when they do not find one. Measured over 28 days, ChatGPT sent this site 135
# visitors against Google's 1 — 77% of everyone who found us. Not boilerplate.
# This is an allow list, not a block list.
User-agent: GPTBot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: ClaudeBot
User-agent: Claude-Web
User-agent: anthropic-ai
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: CCBot
User-agent: Bingbot
User-agent: Yeti
Allow: /

# What this site holds, in one page, for answer engines:
# https://www.kculturewire.com/llms.txt

Sitemap: https://www.kculturewire.com/sitemap.xml

# Every article, newest first, with the date its data was measured.
# Feed: https://www.kculturewire.com/rss.xml
`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
