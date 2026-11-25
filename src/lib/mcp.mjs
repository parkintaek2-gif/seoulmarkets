/**
 * mcp.mjs — **SeoulMarkets 자료를 MCP 서버로 낸다.** (`POST /v1/mcp`)
 *
 * ── 왜 (2026-11-26 · 5번) ───────────────────────────────────────────
 * 사장님 2026-11-25 — 「에스마켓츠 어디에 팔 지 정했으니 팔기 시작해」.
 * 정해 둔 다섯 가운데 둘째다. 우리 영어권 손님은 구글이 아니라 ChatGPT·Claude 로 온다.
 * 그 손님의 AI 가 우리 자료를 «직접 부를» 길이 없었다 — /v1 은 사람이 문서를 읽고 짜야 쓴다.
 *
 * ── 어떻게 ─────────────────────────────────────────────────────────
 * 새 자료 길을 만들지 않는다. **이미 있는 /v1 GET 을 그대로 부른다.**
 * 등급·한도·출처 표기·「못 받은 것은 못 받았다」가 전부 /v1 안에 있다. 여기서 다시 짓지 않는다.
 * 상태가 없다(세션을 안 둔다) — 요청 하나에 JSON 하나로 답한다(Streamable HTTP 의 JSON 응답).
 *
 * ⛔ 도구가 «없는 자료»를 있는 것처럼 말하지 않는다 — /v1 이 낸 것을 손대지 않고 넘긴다.
 * ⛔ 손님 열쇠(Authorization·x-api-key)는 /v1 에 그대로 넘기기만 한다. 적지 않는다.
 *
 *   node src/lib/mcp.mjs --자가시험
 */

export const 규격판 = ['2025-06-18', '2025-03-26', '2024-11-05'];
export const 서버정보 = { name: 'seoulmarkets', title: 'SeoulMarkets — Korean market data in English', version: '1.0.0' };

const 글 = (설명) => ({ type: 'string', description: 설명 });
const 수 = (설명) => ({ type: 'integer', description: 설명, minimum: 1, maximum: 500 });
const 한도 = 수('Maximum rows to return (free tier caps this).');

/** 도구표 — 길(path)의 {이름}은 인자에서 뽑고, 나머지 인자는 쿼리로 넘긴다 */
export const 도구표 = [
  { name: 'coverage', 길: '/v1/meta', description: 'What SeoulMarkets has actually collected: datasets, row counts, date ranges, and what is NOT covered. Call this first when unsure whether a question can be answered.', 인자: {} },
  { name: 'korea_trade_by_country', 길: '/v1/trade/exports', description: 'Korea exports, imports and trade balance by partner country and month (customs basis). National totals by default.', 인자: { country: 글('Partner country, English name or code, e.g. "vietnam". Omit for national totals.'), since: 글('Earliest month, YYYY-MM.'), limit: 한도 } },
  /* ⛔ `/v1/trade/flash` 는 도구로 내지 않는다 — 2026-11-26 에 불러 보니 「collection_not_started」였다.
     못 받는 자료를 도구 목록에 세우면 손님의 AI 가 «있는 것»으로 안다. 받기 시작하면 그때 더한다. */
  { name: 'trade_countries', 길: '/v1/countries', description: 'Partner country codes with English names, for use with korea_trade_by_country.', 인자: {} },
  { name: 'hs_code_lookup', 길: '/v1/hs/{code}', description: 'Resolve an HS code (2, 4, 6 or 10 digits) to its English description.', 인자: { code: 글('HS code digits.') }, 필수: ['code'] },
  { name: 'hs_code_search', 길: '/v1/hs', description: 'Search HS chapters and headings by English keyword.', 인자: { q: 글('English keyword, e.g. "semiconductor".') }, 필수: ['q'] },
  { name: 'company_valuation', 길: '/v1/valuation', description: 'PER, PBR, ROE and debt-to-equity for listed Korean companies, with the price date and the financial-statement vintage each multiple was computed from.', 인자: { ticker: 글('6-digit KRX ticker, e.g. "005930".'), industry: 글('Industry name filter.'), measured: 글('"true" to keep only rows where the multiple could be computed.'), limit: 한도 } },
  { name: 'company_financials', 길: '/v1/financials', description: 'Annual financial statements of Korean listed companies as filed to DART, with English account names.', 인자: { ticker: 글('6-digit KRX ticker.'), year: 글('Fiscal year, YYYY.'), market: 글('KOSPI or KOSDAQ.'), name: 글('Company name (English or Korean).'), limit: 한도 } },
  { name: 'analyst_target_prices', 길: '/v1/consensus', description: 'Analyst target-price reports and analyst rankings for Korean listed companies. Facts only, no report text.', 인자: { kind: 글('"reports" or "rankings".'), ticker: 글('6-digit KRX ticker.'), house: 글('Brokerage name.'), since: 글('Earliest date, YYYY-MM-DD.'), limit: 한도 } },
  { name: 'brokerage_research', 길: '/v1/research', description: 'Brokerage target prices and ratings, 2007 onward. Filter by broker, subject company, date, rating or stance.', 인자: { broker: 글('Brokerage, Korean or English name.'), subject: 글('Covered company, Korean or English name.'), since: 글('Earliest date, YYYY-MM-DD.'), rating: 글('Rating text filter.'), stance: 글('buy, hold or sell.'), limit: 한도 } },
  { name: 'research_institutions', 길: '/v1/institutions', description: 'Korean research institutions in English: official names, rename history, and which ones actually issue target prices.', 인자: { type: 글('Institution type filter.') } },
  { name: 'krx_index_series', 길: '/v1/indices', description: 'Dated time series for KRX indices, in English. Use list=true to see the index names available.', 인자: { list: 글('"true" to list available indices.'), name: 글('Index name, e.g. "KOSPI 200".'), family: 글('Index family filter.'), since: 글('YYYY-MM-DD.'), until: 글('YYYY-MM-DD.'), limit: 한도 } },
  { name: 'ownership_filings', 길: '/v1/ownership', description: 'Substantial-shareholding (5% rule) and officer/major-shareholder ownership filings for Korean listed companies.', 인자: { kind: 글('"substantial" or "executives".'), ticker: 글('6-digit KRX ticker.'), name: 글('Filer or company name.'), limit: 한도 } },
  { name: 'convertible_bond_filings', 길: '/v1/mezzanine', description: 'Convertible bond, bond-with-warrant and exchangeable bond issuance filings in Korea.', 인자: { ticker: 글('6-digit KRX ticker.'), type: 글('CB, BW or EB.'), name: 글('Issuer name.'), limit: 한도 } },
  { name: 'workforce_filings', 길: '/v1/people', description: 'Workforce filings for listed Korean companies: headcount, tenure and pay, by gender.', 인자: { ticker: 글('6-digit KRX ticker.'), market: 글('KOSPI or KOSDAQ.'), name: 글('Company name.'), limit: 한도 } },
  { name: 'account_dictionary', 길: '/v1/account-dictionary', description: 'Korean financial-statement account names mapped to standard English.', 인자: { q: 글('Korean or English account name.'), type: 글('Statement type filter.'), limit: 한도 } },
  { name: 'uae_company_financials', 길: '/v1/uae-financials', description: 'Revenue, net profit, EPS and (where reconciled) balance sheet for Abu Dhabi (ADX) and Dubai (DFM) listed companies.', 인자: { symbol: 글('Exchange symbol.'), exchange: 글('ADX or DFM.'), period: 글('Reporting period.'), limit: 한도 } },
];

const 안내 = 'SeoulMarkets serves Korean (KRX/DART/customs) and UAE (ADX/DFM) market data normalised to English. '
  + 'Every result names its source and the date it was collected. Fields the source did not provide are marked as not collected, never filled with zero. '
  + 'These are statistics, not investment advice. Free tier is rate-limited; licences: https://seoulmarkets.com/pricing';

/** MCP 가 보는 도구 목록 */
export function 도구목록() {
  return 도구표.map((d) => ({
    name: d.name,
    title: d.name.replace(/_/g, ' '),
    description: d.description,
    inputSchema: { type: 'object', properties: d.인자, ...(d.필수 ? { required: d.필수 } : {}), additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }));
}

/** 도구 이름과 인자로 /v1 길과 쿼리를 만든다. 모르는 도구·빠진 필수 인자는 { 잘못 } */
export function 길만들기(이름, 인자 = {}) {
  const d = 도구표.find((x) => x.name === 이름);
  if (!d) return { 잘못: `Unknown tool: ${String(이름).slice(0, 60)}` };
  const 받은 = (인자 && typeof 인자 === 'object') ? 인자 : {};
  for (const k of (d.필수 || [])) {
    if (받은[k] === undefined || 받은[k] === null || String(받은[k]).trim() === '') return { 잘못: `Missing required argument: ${k}` };
  }
  let 길 = d.길;
  const 쿼리 = new URLSearchParams();
  for (const k of Object.keys(d.인자)) {
    const v = 받은[k];
    if (v === undefined || v === null || String(v).trim() === '') continue;
    const s = String(v).slice(0, 200);
    if (길.includes(`{${k}}`)) 길 = 길.replace(`{${k}}`, encodeURIComponent(s));
    else 쿼리.set(k, s);
  }
  return { 길, 쿼리 };
}

const 답 = (id, result) => ({ jsonrpc: '2.0', id, result });
const 틀림 = (id, code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

/** 요청 하나를 처리한다. 알림(id 없음)이면 null */
async function 하나(m, 부른다) {
  if (!m || typeof m !== 'object' || m.jsonrpc !== '2.0' || typeof m.method !== 'string') return 틀림(m && m.id, -32600, 'Invalid Request');
  const 알림인가 = m.id === undefined || m.id === null;
  if (m.method.startsWith('notifications/')) return null;
  if (알림인가) return null;
  switch (m.method) {
    case 'initialize': {
      const 바란 = m.params && m.params.protocolVersion;
      return 답(m.id, {
        protocolVersion: 규격판.includes(바란) ? 바란 : 규격판[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: 서버정보,
        instructions: 안내,
      });
    }
    case 'ping': return 답(m.id, {});
    case 'tools/list': return 답(m.id, { tools: 도구목록() });
    case 'tools/call': {
      const p = m.params || {};
      const 것 = 길만들기(p.name, p.arguments);
      if (것.잘못) return 답(m.id, { content: [{ type: 'text', text: 것.잘못 }], isError: true });
      let r = null;
      try { r = await 부른다(것.길, 것.쿼리); } catch { r = null; }
      if (!r) return 답(m.id, { content: [{ type: 'text', text: 'The data service did not answer. Try again shortly.' }], isError: true });
      const 몸 = typeof r.body === 'string' ? r.body : JSON.stringify(r.body ?? {});
      return 답(m.id, { content: [{ type: 'text', text: 몸.slice(0, 200000) }], isError: !(r.status >= 200 && r.status < 300) });
    }
    case 'resources/list': return 답(m.id, { resources: [] });
    case 'prompts/list': return 답(m.id, { prompts: [] });
    default: return 틀림(m.id, -32601, `Method not found: ${m.method.slice(0, 60)}`);
  }
}

/**
 * HTTP 한 번을 처리한다 → { status, headers, body }
 * @param {string} method  HTTP 메서드
 * @param {string|null} 본문  POST 본문(글)
 * @param {(길: string, 쿼리: URLSearchParams) => Promise<{status:number, body:string}|null>} 부른다
 */
export async function handleMcp(method, 본문, 부른다) {
  const 머리 = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
  if (method === 'GET' || method === 'HEAD') {
    /* 사람이 브라우저로 열었을 때 — 무엇인지와 붙이는 법을 알려 준다(SSE 흐름은 안 낸다) */
    return { status: 200, headers: 머리, body: JSON.stringify({
      service: 'SeoulMarkets MCP server', transport: 'Streamable HTTP (stateless, JSON responses)',
      endpoint: 'https://seoulmarkets.com/v1/mcp', tools: 도구표.length,
      how: 'Add this URL as a remote MCP server (custom connector) in your AI client. POST JSON-RPC 2.0.',
      docs: 'https://seoulmarkets.com/mcp',
    }, null, 2) };
  }
  if (method !== 'POST') return { status: 405, headers: { ...머리, Allow: 'GET, POST' }, body: JSON.stringify(틀림(null, -32600, 'Use POST')) };
  let 받은 = null;
  try { 받은 = JSON.parse(본문 ?? ''); } catch { 받은 = undefined; }
  if (받은 === undefined || 받은 === null) return { status: 400, headers: 머리, body: JSON.stringify(틀림(null, -32700, 'Parse error')) };
  if (Array.isArray(받은)) {
    if (!받은.length || 받은.length > 20) return { status: 400, headers: 머리, body: JSON.stringify(틀림(null, -32600, 'Invalid batch')) };
    const 것들 = [];
    for (const m of 받은) { const r = await 하나(m, 부른다); if (r) 것들.push(r); }
    if (!것들.length) return { status: 202, headers: 머리, body: '' };
    return { status: 200, headers: 머리, body: JSON.stringify(것들) };
  }
  const r = await 하나(받은, 부른다);
  if (!r) return { status: 202, headers: 머리, body: '' };
  return { status: 200, headers: 머리, body: JSON.stringify(r) };
}

/* ── 자가시험 ──────────────────────────────────────────────────────── */
async function 자가시험() {
  const 것 = [];
  const 본다 = (이름, 참) => 것.push({ 이름, 참: !!참 });
  const 부른곳 = [];
  const 가짜 = async (길, 쿼리) => { 부른곳.push(길 + '?' + 쿼리.toString()); return { status: 길.includes('없음') ? 404 : 200, body: '{"ok":true}' }; };
  const 보낸다 = async (m) => { const r = await handleMcp('POST', JSON.stringify(m), 가짜); return { ...r, j: r.body ? JSON.parse(r.body) : null }; };

  const 첫 = await 보낸다({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 't', version: '0' } } });
  본다('initialize — 손님이 바란 규격판을 되돌려 준다', 첫.status === 200 && 첫.j.result.protocolVersion === '2025-03-26' && 첫.j.result.capabilities.tools);
  const 모르는판 = await 보낸다({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '1999-01-01' } });
  본다('모르는 규격판이면 우리가 아는 가장 새 것을 낸다', 모르는판.j.result.protocolVersion === 규격판[0]);
  const 알림 = await 보낸다({ jsonrpc: '2.0', method: 'notifications/initialized' });
  본다('알림에는 202 와 빈 몸', 알림.status === 202 && 알림.body === '');
  const 목록 = await 보낸다({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  본다('도구 목록 — 표와 수가 같고 전부 입력 틀이 있다', 목록.j.result.tools.length === 도구표.length && 목록.j.result.tools.every((t) => t.inputSchema && t.inputSchema.type === 'object' && t.description.length > 20));
  본다('도구 이름이 겹치지 않는다', new Set(도구표.map((d) => d.name)).size === 도구표.length);
  본다('모든 도구의 길이 /v1/ 로 시작한다', 도구표.every((d) => d.길.startsWith('/v1/')));
  본다('필수 인자는 인자표에 있는 이름이다', 도구표.every((d) => (d.필수 || []).every((k) => k in d.인자)));

  부른곳.length = 0;
  const 부름 = await 보낸다({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'korea_trade_by_country', arguments: { country: 'vietnam', since: '2025-01', 엉뚱한것: 'x' } } });
  본다('도구 부름 — /v1 길과 쿼리로 옮긴다. 표에 없는 인자는 버린다', 부름.j.result.isError === false && 부른곳[0] === '/v1/trade/exports?country=vietnam&since=2025-01');
  부른곳.length = 0;
  await 보낸다({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'hs_code_lookup', arguments: { code: '8542/../x' } } });
  본다('길에 드는 인자는 주소 글자로 바꾼다 — 길을 빠져나가지 못한다', 부른곳[0] === '/v1/hs/8542%2F..%2Fx?');
  const 빠짐 = await 보낸다({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'hs_code_search', arguments: {} } });
  본다('⛔ 필수 인자가 빠지면 부르지 않고 틀렸다고 답한다', 빠짐.j.result.isError === true && /Missing required/.test(빠짐.j.result.content[0].text));
  const 모름 = await 보낸다({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: '없는도구' } });
  본다('⛔ 모르는 도구', 모름.j.result.isError === true);
  const 죽음 = await handleMcp('POST', JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'coverage' } }), async () => { throw new Error('일부러'); });
  본다('⛔ /v1 이 터져도 서버는 답한다', JSON.parse(죽음.body).result.isError === true);
  const 없는법 = await 보낸다({ jsonrpc: '2.0', id: 8, method: 'sampling/createMessage' });
  본다('모르는 메서드는 -32601', 없는법.j.error.code === -32601);
  const 깨짐 = await handleMcp('POST', '{깨진', 가짜);
  본다('깨진 JSON 은 400 · -32700', 깨짐.status === 400 && JSON.parse(깨짐.body).error.code === -32700);
  const 묶음 = await handleMcp('POST', JSON.stringify([{ jsonrpc: '2.0', id: 1, method: 'ping' }, { jsonrpc: '2.0', method: 'notifications/initialized' }]), 가짜);
  본다('묶음 — 알림은 빼고 답한다', JSON.parse(묶음.body).length === 1);
  const 열어봄 = await handleMcp('GET', null, 가짜);
  본다('GET 은 안내를 낸다', 열어봄.status === 200 && JSON.parse(열어봄.body).tools === 도구표.length);
  const 지움 = await handleMcp('DELETE', null, 가짜);
  본다('그 밖의 메서드는 405', 지움.status === 405);

  const 빨강 = 것.filter((x) => !x.참);
  console.log(`■ MCP 자가시험 ${것.length - 빨강.length}/${것.length}`);
  for (const x of 것) console.log(`  ${x.참 ? '✅' : '🔴'} ${x.이름}`);
  return 빨강.length === 0;
}

if (process.argv.includes('--자가시험')) process.exit((await 자가시험()) ? 0 : 1);
