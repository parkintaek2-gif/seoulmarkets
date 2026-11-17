/**
 * 나이로 보기 — 지면에 나갈 값을 여기서 만든다.
 *
 * ⛔ 평균만 보여주지 않는다. 분포를 먼저 보여준다.
 *    평균이 규범으로 읽히는 순간 지도가 아니라 압박이 된다.
 * ⛔ 「늦었다」·「이르다」·「해야 한다」를 쓰지 않는다. 우리가 정할 자격이 없다.
 * ⚠ 한 살로 잰 자료와 다섯 살·열 살로 묶인 자료가 섞여 있다.
 *   묶인 값을 한 살처럼 말하면 거짓이 된다 — 어느 띠에서 온 값인지 지면에 함께 적는다.
 */

export type 나이자료 = {
  만든날: string;
  출처: Record<string, any>;
  임금: Record<string, { 월급여천원?: number; 근속년?: number; 사람?: number }>;
  살림: Record<string, Record<string, number>>;
  혼인: {
    총건: number;
    남편분포: { 시작나이: number; 값: number[] };
    아내분포: { 시작나이: number; 값: number[] };
    최다: { 남편: string; 아내: string };
    누적: Record<string, { 남편: number; 아내: number }>;
  };
  고용: Record<string, number>;
};

/** 임금 표의 띠 이름 — 표가 쓰는 글자 그대로여야 값을 찾는다 */
export function 임금띠(나이: number): string {
  if (나이 < 20) return '~ 19세';
  if (나이 >= 60) return '60세 ~';
  const 아래 = Math.floor(나이 / 5) * 5;
  return `${아래} ~ ${아래 + 4}`;
}

/** 가계금융복지조사의 띠 이름 */
export function 살림띠(나이: number): string {
  if (나이 <= 29) return '29세 이하';
  if (나이 >= 60) return '60세 이상';
  const 아래 = Math.floor(나이 / 10) * 10;
  return `${아래}~${아래 + 9}세`;
}

/** 천원 단위 월급여를 사람이 읽는 말로 — 3185 → 「318만 5천원」 */
export function 월급말(천원?: number): string | null {
  if (천원 === null || 천원 === undefined) return null;
  const 원 = Math.round(천원) * 1000;
  const 만 = Math.floor(원 / 10000);
  const 나머지 = Math.round((원 % 10000) / 1000);
  return 나머지 ? `${만.toLocaleString()}만 ${나머지}천원` : `${만.toLocaleString()}만원`;
}

/** 만원 단위를 사람이 읽는 말로 — 62714 → 「6억 2,714만원」 */
export function 만원말(만원?: number | null): string | null {
  if (만원 === null || 만원 === undefined) return null;
  const 반올림 = Math.round(만원);
  const 억 = Math.floor(반올림 / 10000);
  const 남은 = 반올림 % 10000;
  if (!억) return `${남은.toLocaleString()}만원`;
  return 남은 ? `${억}억 ${남은.toLocaleString()}만원` : `${억}억원`;
}

/** 한글 나이 — 지면 제목에 쓴다 */
const 한글나이: Record<number, string> = {
  25: '스물다섯', 32: '서른둘', 40: '마흔', 55: '쉰다섯', 68: '예순여덟',
};
export function 나이말(나이: number): string {
  return 한글나이[나이] ?? `${나이}세`;
}

/**
 * 🔴 [2026-11-18 · 5번] **제목에는 아라비아 숫자를 함께 적는다.**
 *   손님이 네이버에 치는 말은 「32살」·「32세」이지 「서른둘」이 아니다.
 *   제목이 「서른둘 — 남들은 어떻게 하고 있나」라서 그 말로는 한 번도 안 걸렸다.
 *   ⛔ 본문의 한글 나이는 그대로 둔다 — 읽기에는 그쪽이 낫다. 제목만 바꾼다.
 *   ⚠ 「제목에 사람이 치는 말이 있어야 든다」를 지역 지면에서 실측으로 확인했다
 *     (「의정부시 고등학교」 우리 0개 대 「… 진학률」 우리 6개).
 */
export function 제목나이말(나이: number): string {
  const 한글 = 한글나이[나이];
  return 한글 ? `${나이}세(${한글})` : `${나이}세`;
}

/** 그 나이까지 초혼한 사람이 백에 몇인가 — 표에 있는 나이만 답한다 */
export function 혼인누적(자료: 나이자료, 나이: number): { 남편: number; 아내: number } | null {
  return (자료.혼인.누적 as any)[String(나이)] ?? null;
}

/**
 * 표의 띠 이름을 지면에 쓸 말로 — 「60세 ~」 뒤에 「세」를 또 붙이면 「60세 ~세」가 된다.
 * 표가 쓰는 글자와 사람이 읽는 말은 다르다. 섞지 않는다.
 */
export function 띠말(띠: string): string {
  if (띠 === '60세 ~') return '예순 넘은';
  if (띠 === '~ 19세') return '열아홉 아래';
  const m = 띠.match(/^(\d+)\s*~\s*(\d+)$/);
  if (m) return `${m[1]}~${m[2]}세`;
  return 띠;                       // 살림 띠(「30~39세」·「60세 이상」)는 이미 사람이 읽는 말이다
}

export function 임금값(자료: 나이자료, 나이: number) {
  const 띠 = 임금띠(나이);
  const v = 자료.임금[띠];
  if (!v) return null;
  return { 띠, 띠말: 띠말(띠), 월급: 월급말(v.월급여천원), 근속: v.근속년 ?? null, 사람: v.사람 ?? null };
}

export function 살림값(자료: 나이자료, 나이: number) {
  const 띠 = 살림띠(나이);
  const v = 자료.살림[띠];
  if (!v) return null;
  return {
    띠,
    자산평균: 만원말(v['자산_전가구평균']),
    자산중앙: 만원말(v['자산_보유가구중앙']),
    부채평균: 만원말(v['부채_전가구평균']),
    소득중앙: 만원말(v['경상소득_보유가구중앙']),
  };
}

/** 나이대별 고용률 — 임금띠와 같은 이름표를 쓴다(collect-age-axis.mjs가 그렇게 맞춰 냈다) */
export function 고용값(자료: 나이자료, 나이: number) {
  const 띠 = 임금띠(나이);
  const 몫 = 자료.고용[띠];
  if (몫 === undefined) return null;
  return { 띠, 띠말: 띠말(띠), 고용률: 몫 };
}

/** 고용률이 가장 높은 띠 */
export function 고용꼭대기(자료: 나이자료) {
  const 줄 = Object.entries(자료.고용).filter(([띠]) => 띠 !== '전체' && 띠 !== '15~29세_청년');
  let 으뜸: [string, number] | null = null;
  for (const 칸 of 줄) if (!으뜸 || 칸[1] > 으뜸[1]) 으뜸 = 칸 as [string, number];
  return 으뜸 ? { 띠: 으뜸[0], 띠말: 띠말(으뜸[0]), 고용률: 으뜸[1] } : null;
}

/** 월급여가 가장 높은 띠 — 「꼭대기가 어디인가」는 지면마다 되풀이해 쓰인다 */
export function 임금꼭대기(자료: 나이자료) {
  const 줄 = Object.entries(자료.임금).filter(([띠]) => 띠 !== '전체');
  let 으뜸: [string, any] | null = null;
  for (const 칸 of 줄) if (!으뜸 || (칸[1].월급여천원 ?? 0) > (으뜸[1].월급여천원 ?? 0)) 으뜸 = 칸;
  return 으뜸 ? { 띠: 으뜸[0], 띠말: 띠말(으뜸[0]), 월급: 월급말(으뜸[1].월급여천원) } : null;
}

/**
 * 사망원인통계(death-causes-by-age.json)의 열 살 단위 띠 이름.
 * ⚠ 이 자료는 극히 민감하다(자살 포함) — /100y/death-causes 지면이 지키는 것과
 *   같은 원칙을 여기서도 지킨다: 구경거리로 안 만든다 · 까닭을 안 지어낸다.
 */
export function 사망원인띠(나이: number): string {
  if (나이 < 1) return '0세';
  if (나이 < 10) return '1-9세';
  if (나이 < 20) return '10-19세';
  if (나이 >= 80) return '80세 이상';
  const 아래 = Math.floor(나이 / 10) * 10;
  return `${아래}-${아래 + 9}세`;
}

/** 그 나이띠의 사망원인 1~5위(계, 최신 해) — 자료가 없으면 null */
export function 사망원인값(자료: any, 나이: number, 상위 = 5) {
  const 띠 = 사망원인띠(나이);
  const 칸들 = (자료?.칸들 ?? []) as any[];
  if (!칸들.length) return null;
  const 해들 = [...new Set(칸들.map((x: any) => x.해))].sort((a: number, b: number) => b - a);
  const 새해 = 해들[0];
  const 줄 = 칸들
    .filter((x: any) => x.해 === 새해 && x.성 === '계' && x.나이 === 띠 && x.순위 <= 상위)
    .sort((a: any, b: any) => a.순위 - b.순위);
  if (!줄.length) return null;
  const 자해있나 = 줄.some((r: any) => /고의적 자해/.test(r.사망원인 ?? ''));
  return { 띠, 해: 새해, 줄, 자해있나 };
}
