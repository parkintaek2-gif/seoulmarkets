#!/usr/bin/env node
/**
 * 롤드컵-끝나면-시킨다.mjs — **롤드컵 본선 경기가 끝나면 그 자리에서 중부매일 계정에 기사를 시킨다.**
 *
 * ── 🔴 왜 (2026-11-04 · 1번) ─────────────────────────────────────────
 * 사장님 — 「내일 아침 경기가 끝나면 바로 기사를 이메일로 받을 수 있게 조치해놔.
 *   6일, 7일까지 8강이고, 8일과 9일 4강, 15일에 결승전이 열린다.
 *   이때도 경기 끝나면 바로 기사를 이메일로 받을 수 있게 조치해놔」
 * 8강·4강은 07시, 결승은 04시에 시작하는 5판 3선승제다. 끝나는 시각이 09~11시로
 * 흔들려 09시 회차가 끝나기 전에 돌 수 있다. ⇒ 라이엇 공식 일정을 짚어
 * «끝난 것을 본 그때» 시킨다. 거둬서 데스킹하고 보내는 일은 5번이 한다.
 *
 * ⛔ 한 경기에 한 번만 시킨다 — docs/롤드컵-시킨자국.tsv 에 경기 번호를 남긴다.
 *
 * 쓰는 법
 *   node scripts/롤드컵-끝나면-시킨다.mjs            오늘 경기를 짚는다(끝났으면 시킨다)
 *   node scripts/롤드컵-끝나면-시킨다.mjs --짚어본다  시키지 않고 상태만 본다
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const 뿌리 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const 자국 = path.join(뿌리, 'docs', '롤드컵-시킨자국.tsv');
const RIOT = { 'x-api-key': '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z' };
const WORLDS = '98767975604431411';
const 짚기만 = process.argv.includes('--짚어본다');

const 단계말 = { Quarterfinals: '8강', Semifinals: '4강', Finals: '결승' };
const 팀말 = {
  GEN: '젠지', T1: 'T1', DK: '디플러스 기아', HLE: '한화생명e스포츠', KT: 'kt 롤스터',
  BLG: '빌리빌리 게이밍', IG: 'Invictus Gaming', TES: 'Top Esports', AL: '애니원즈 레전드',
  KC: 'Karmine Corp', LYON: 'LYON', G2: 'G2 Esports',
};

async function 일정() {
  const 모은것 = [];
  let 토큰 = '';
  for (let i = 0; i < 5; i++) {
    const r = await fetch(`https://esports-api.lolesports.com/persisted/gw/getSchedule?hl=en-US&leagueId=${WORLDS}${토큰 ? `&pageToken=${토큰}` : ''}`, { headers: RIOT });
    const d = (await r.json()).data.schedule;
    모은것.push(...d.events);
    if (!d.pages.newer) break;
    토큰 = d.pages.newer;
  }
  return 모은것.filter((e) => 단계말[e.blockName]);
}

function 한국날짜(t) {
  return new Date(t).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short' });
}

function 지시문(e) {
  const [a, b] = e.match.teams;
  const 이긴팀 = (a.result?.gameWins ?? 0) > (b.result?.gameWins ?? 0) ? a : b;
  const 진팀 = 이긴팀 === a ? b : a;
  const 이름 = (x) => 팀말[x.code] ?? x.name;
  const 단계 = 단계말[e.blockName];
  const 시각 = new Date(e.startTime).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false });
  return `[사장님 지시 — 지금 바로] 리그 오브 레전드 월드 챔피언십 ${단계} 경기가 방금 끝났습니다. 이 대화에서 3세트까지 미리 써 둔 본문이 있으면 그것을 살려 완성하고, 없으면 처음부터 한 건을 써 주십시오.

경기: ${한국날짜(e.startTime)} 한국시간 ${시각} 시작, ${이름(a)} 대 ${이름(b)}, 5판 3선승제.
라이엇 공식 일정 결과: 승리 ${이름(이긴팀)}, 패배 ${이름(진팀)}, 세트 스코어 ${이긴팀.result.gameWins}대 ${진팀.result.gameWins}.

1. 세트마다 어디서 승부가 났는지, 어느 선수가 어떤 챔피언으로 무엇을 했는지 쓰십시오. 킬 수, 경기 시간, 오브젝트 수치는 라이엇 공식 기록과 네이버 e스포츠로 확인해 넣으십시오.
2. 시각은 반드시 한국시간으로 쓰십시오. 개최지와 현지 시각을 그대로 옮기지 마십시오.
3. 다음 상대와 다음 경기 날짜·시각(한국시간)을 끝 문단에 적으십시오. 정해지지 않았으면 쓰지 않습니다.
4. 형식은 평소대로 자체기사 지침 v7: [제목] [부제목] [사진 제목 및 캡션] [본문] [추천 키워드 3개]. 본문 여섯 문단 안팎, 맨 앞 [중부매일 박인택 기자].
5. 사진은 라이엇 게임즈 공식 사진이 있으면 주소를 함께 주고, 없으면 사진 미확보라고 적으십시오.
6. 순한글로 지어낸 말과 번역투를 쓰지 말고, 평소 지침의 금지 어미를 지키십시오. 한 매체만 적은 내용은 쓰지 않습니다. 확인하지 못한 것은 지어내지 마십시오.
7. 끝에 자료 출처를 한 줄 적어 주십시오.
8. 사장님 지시(2026-11-07): 데스킹까지 이 대화에서 마치고(자체기사 지침 v7·스타일북 2026), Gmail로 parkintaek2@gmail.com 에 직접 보내십시오. 메일 제목은 [중부매일] 기사 제목 (데스킹 완료). 사진은 링크와 사진 설명을 함께 적습니다. 보낸 뒤 「보냈다」와 시각을 적고, 막히면 지어내지 말고 「못 보냈다」와 그 이유를 적으십시오.`;
}

const 시킨것 = fs.existsSync(자국) ? fs.readFileSync(자국, 'utf8') : '';
const 오늘 = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
const 오늘경기 = (await 일정()).filter((e) => new Date(e.startTime).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }) === 오늘);

if (!오늘경기.length) { console.log('오늘 롤드컵 본선 경기 없음'); process.exit(0); }
for (const e of 오늘경기) {
  const [a, b] = e.match.teams;
  const 판 = `${a.code} ${a.result?.gameWins ?? '-'}:${b.result?.gameWins ?? '-'} ${b.code}`;
  if (시킨것.includes(e.match.id)) { console.log(`이미 시킴 — ${판}`); continue; }
  /* 라이엇 일정은 3:0이 나도 한참 «inProgress»로 남는다(2026-11-05 09:35~). 선승 수에 닿으면 끝난 것으로 본다 */
  const 선승 = Math.ceil((e.match.strategy?.count ?? 5) / 2);
  const 끝남 = e.state === 'completed' || [a, b].some((x) => (x.result?.gameWins ?? 0) >= 선승);
  if (!끝남) { console.log(`아직 — ${e.state} ${판}`); continue; }
  if (짚기만) { console.log(`끝남(짚기만) — ${판}`); continue; }
  const 파일 = path.join(뿌리, 'docs', `지시-중부매일-${오늘.replaceAll('-', '')}-롤드컵-${e.blockName}.txt`);
  fs.writeFileSync(파일, 지시문(e) + '\n');
  execFileSync('node', [path.join(뿌리, 'scripts', '밖으로나가는말-관문.mjs'), 파일], { stdio: 'inherit' });
  execFileSync('node', [path.join(뿌리, 'scripts', '시킨다-중부매일-기사.mjs'), '--회차', '09', '--글', 파일], { stdio: 'inherit' });
  fs.appendFileSync(자국, `${new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' })}\t${e.match.id}\t${판}\t${path.basename(파일)}\n`);
  console.log(`✅ 시켰다 — ${판} · ${path.basename(파일)}`);
}
