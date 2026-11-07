#!/usr/bin/env node
/**
 * 한국시리즈-끝나면-시킨다.mjs — **한국시리즈 경기를 지켜보다가 7회가 끝나면 미리쓰기를,
 *   경기가 끝나면 완성·데스킹·메일 발송을 중부매일계정에 시킨다.**
 *
 * 🔴 사장님 (2026-11-07) 「오후 2시 한국시리즈 시작한다. 경기 끝나자마자 기사 받을 수 있게 조치해라.
 *   사진은 찾지마라.」
 *
 * 경기 상태는 네이버 스포츠 문자중계 화면이 부르는 경기 정보(api-gw …/schedule/games/<id>)를
 * 9222 크롬 탭으로 받는다. ⚠ 이 PC 에서 그 주소를 curl 로 직접 부르면 멈춘다(2026-11-07 실측).
 * ⚠ 9223(헤드리스)으로 열면 「로딩중」에서 멈춘다 — 9222 를 쓴다. 내 탭만 닫는다.
 *
 * 쓰는 법
 *   node scripts/한국시리즈-끝나면-시킨다.mjs --경기 77771107KTSS02026 --차전 4 --회차 16
 *   (끝날 때까지 3분마다 본다. 두 번 시키지 않는다 — docs/한국시리즈-시킨자국.tsv)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const 뿌리 = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const 인자 = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const 경기 = 인자('--경기');
const 차전 = 인자('--차전', '');
const 회차 = 인자('--회차', '16');
if (!경기) { console.error('쓰는 법: --경기 <네이버 경기 id> --차전 <n> --회차 16'); process.exit(1); }
const 자국 = path.join(뿌리, 'docs', '한국시리즈-시킨자국.tsv');
const 시킨것 = () => (fs.existsSync(자국) ? fs.readFileSync(자국, 'utf8') : '');
const 지금 = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' });

const require = createRequire('file:///C:/Users/User/Documents/GitHub/klifemap/package.json');
const puppeteer = require('puppeteer-core');

async function 상태() {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await b.newPage();
  const 받은 = [];
  p.on('response', async (r) => { if (r.url().includes('api-gw.sports.naver.com/schedule/games/' + 경기)) { try { 받은.push(await r.text()); } catch {} } });
  try {
    await p.goto('https://m.sports.naver.com/game/' + 경기 + '/relay', { waitUntil: 'networkidle2', timeout: 90000 });
    for (const t of 받은) { try { const g = JSON.parse(t).result.game; if (g) return g; } catch {} }
    return null;
  } finally { await p.close().catch(() => {}); b.disconnect(); }
}

function 시킨다(이름, 글) {
  const 파일 = path.join(뿌리, 'docs', `지시-중부매일-${지금().slice(0, 10).replaceAll('-', '')}-KS${차전}-${이름}.txt`);
  fs.writeFileSync(파일, 글 + '\n');
  execFileSync('node', [path.join(뿌리, 'scripts', '밖으로나가는말-관문.mjs'), 파일], { stdio: 'inherit' });
  execFileSync('node', [path.join(뿌리, 'scripts', '시킨다-중부매일-기사.mjs'), '--회차', 회차, '--글', 파일], { stdio: 'inherit' });
  fs.appendFileSync(자국, `${지금()}\t${경기}\t${이름}\t${path.basename(파일)}\n`);
  console.log(`✅ 시켰다 — ${이름} · ${path.basename(파일)}`);
}

const 공통 = (g) => `경기: 2026 KBO 한국시리즈 ${차전}차전 ${g.awayTeamName}-${g.homeTeamName}, ${g.gameDateTime?.slice(5, 10).replace('-', '월 ')}일 ${g.gameDateTime?.slice(11, 16)} ${g.stadium ?? ''}.`;
const 형식 = `형식은 평소대로 자체기사 지침 v7: [제목] [부제목] [본문] [추천 키워드 3개]. 본문 1,000자 이상(1,300자를 겨냥), 본문 맨 앞 [중부매일 박인택 기자].
사장님 지시: 사진은 찾지 마십시오. 사진 칸은 「사진 없음」으로 둡니다.
숫자(점수, 이닝, 투구 수, 안타, 타점)는 KBO 게임센터와 네이버 스포츠 문자중계로 맞추고, 한 매체만 적은 내용은 쓰지 않습니다. 확인하지 못한 것은 지어내지 마십시오.`;

if (process.argv.includes('--짚기만')) { const g = await 상태(); console.log(g ? `${g.statusCode} ${g.statusInfo} ${g.awayTeamName} ${g.awayTeamScore}:${g.homeTeamScore} ${g.homeTeamName} · ${g.gameDateTime} ${g.stadium} · 승 ${g.winPitcherName ?? '-'} 패 ${g.losePitcherName ?? '-'}` : '못 읽었다'); process.exit(0); }
const 끝 = () => 시킨것().includes(`${경기}\t완성`);
while (!끝()) {
  let g = null;
  try { g = await 상태(); } catch (e) { console.log(지금(), '못 읽었다 —', e.message); }
  if (g) {
    const 회 = Number(String(g.statusInfo ?? '').match(/(\d+)회/)?.[1] ?? 0);
    console.log(지금(), g.statusCode, g.statusInfo, `${g.awayTeamName} ${g.awayTeamScore}:${g.homeTeamScore} ${g.homeTeamName}`);
    const 끝났나 = ['RESULT', 'ENDED', 'CANCEL'].includes(g.statusCode);
    if (!끝났나 && 회 >= 8 && !시킨것().includes(`${경기}\t미리쓰기`)) {
      시킨다('미리쓰기', `[사장님 지시 — 지금 바로] 한국시리즈 ${차전}차전 기사를 미리 써 두십시오. 사장님 말씀 그대로: 「경기 끝나자마자 기사 받을 수 있게 조치해라. 사진은 찾지마라.」

${공통(g)} 지금 ${g.statusInfo}, ${g.awayTeamName} ${g.awayTeamScore}대 ${g.homeTeamScore} ${g.homeTeamName}.

1. 지금 바로 1회부터 7회까지의 흐름(두 팀 선발 투구 내용, 점수가 난 장면, 고비)을 본문으로 써 두십시오.
2. 경기가 끝나면 이 대화로 「끝났다」는 지시가 갑니다. 그때 최종 점수, 8·9회 장면, 승리·패전·세이브 투수를 맨 앞에 넣어 바로 완성합니다. 이기는 팀의 수훈 선수(투수·타자)를 제목과 첫 문단에 세우십시오.
3. 시리즈 전적과 다음 경기 일정(장소·시각)은 KBO 공식 일정으로 끝 문단에 적습니다.
${형식}
4. 경기가 끝나기 전에는 7회까지 쓴 본문만 먼저 답으로 내 주십시오.`);
    }
    if (끝났나) {
      시킨다('완성', `[사장님 지시 — 지금 바로] 한국시리즈 ${차전}차전이 끝났습니다. ${g.awayTeamName} ${g.awayTeamScore}대 ${g.homeTeamScore} ${g.homeTeamName}${g.winPitcherName ? `, 승리투수 ${g.winPitcherName}` : ''}${g.losePitcherName ? `, 패전투수 ${g.losePitcherName}` : ''}. 사장님 말씀 그대로: 「경기 끝나자마자 기사 받을 수 있게 조치해라. 사진은 찾지마라.」

${공통(g)}

1. 써 둔 본문이 있으면 살리고, 최종 점수와 8·9회 장면, 승리·패전·세이브 투수를 맨 앞에 넣어 바로 완성하십시오. 없으면 처음부터 씁니다. 이긴 팀의 수훈 선수(투수·타자)를 제목과 첫 문단에 세우십시오.
2. 시리즈 전적과 다음 경기 일정(장소·시각)은 KBO 공식 일정으로 끝 문단에 적습니다. 시리즈가 끝났으면 우승 팀과 우승 횟수를 KBO 기록으로 맞춰 적습니다.
${형식}
3. 데스킹까지 이 대화에서 마치고(자체기사 지침 v7·스타일북 2026), Gmail로 parkintaek2@gmail.com 에 바로 보내십시오. 메일 제목: [중부매일] 기사 제목 (데스킹 완료). 네이버 주소로는 보내지 않습니다.
4. 보낸 뒤 「보냈다」와 시각을 적으십시오. 막히면 지어내지 말고 「못 보냈다」와 그 이유를 적고 최종본을 이 대화에 내 주십시오.`);
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 3 * 60 * 1000));
}
console.log('끝 — 이 경기는 다 시켰다');
