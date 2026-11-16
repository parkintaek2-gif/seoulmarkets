#!/usr/bin/env bash
# 5번 스테이터스라인 — 사장님 지시를 «돌아가며» 화면에 고정한다.
#
# [2026-08-29 지시] 「터미널(SessionStart/statusLine) — 사장님 지시 이력 상시 고정. >>>똑같이」
#
# ⛔ 예전에는 문장 «하나»를 박아 두었다. 그러면 그 하나만 눈에 익고 나머지 서른은 잊힌다.
# ✅ 이제 대장(docs/5번-사장님-지시-이력.tsv)을 읽어 12초마다 한 건씩 돌린다.
#    ⚠ 요약하지 않고 «원문 그대로» 낸다 — 요약하면 사장님 말씀이 내 말이 된다.
# ⛔ 읽는 자를 여기에 또 짓지 않는다. SessionStart 브리핑과 «같은 자»(scripts/lib/boss-orders.mjs)
#    를 쓴다. 둘이 각자 읽으면 반드시 갈라진다.
#
# ⚠ [2026-08-29] 여기 변수 이름을 한글로 지었다가 bash 가 통째로 못 읽었다.
#   우리 코드는 한글 이름을 쓰지만 «셸 변수»는 안 된다. 셸에서는 ASCII 이름을 쓴다.
cat > /dev/null   # 훅이 넘겨 주는 JSON 은 쓰지 않는다

ROOT="C:/Users/USER/Documents/GitHub/dataeconomics"
TICK=$(( $(date +%s) / 12 ))
FALLBACK='⬜ 지시 이력을 못 읽었다 — docs/5번-사장님-지시-이력.tsv'

LINE=$(node -e "
import('file:///$ROOT/scripts/lib/boss-orders.mjs')
  .then((m) => { process.stdout.write(m.한줄($TICK)); })
  .catch(() => { process.stdout.write(''); });
" 2>/dev/null)

# ⚠ 자가 죽어도 상태줄은 비우지 않는다. 빈 줄은 「지시가 없다」로 읽힌다
[ -z "$LINE" ] && LINE="$FALLBACK"

printf '5번 ┃ %s' "$LINE"
