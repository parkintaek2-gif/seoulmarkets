# Cloudtype 도메인 연결 기록 — 2026-11-16 10:40 KST

⛔ **서비스를 지우면 커스텀 도메인 연결까지 함께 사라진다.** 서비스를 지우거나 다시
만들기 전에 이 표를 본다. 아래가 그날 라이브에 걸려 있던 전부다.

스테이지 `@parkintaek2/seoulmarkets:main` · 앱 `web` · 전부 `node:3000` · 전부 `bound`

| NAME | TYPE | ENTRYPOINT |
|---|---|---|
| port-0 | http | https://port-0-web-ms8nmh0n689e433f.sel3.cloudtype.app |
| mu50ut6gd568fcd2 | http | https://100yearmap.com |
| mu53a7orf3e7f25a | http | https://www.100yearmap.com |
| mu50ukcbe1714050 | http | https://kculturewire.com |
| mu50uosl6eac6836 | http | https://www.kculturewire.com |
| mu50rvple34e9da5 | http | https://seoulmarkets.com |
| mu50u2el35270888 | http | https://www.seoulmarkets.com |

⚠ **이 스테이지 하나가 세 사이트를 같이 낸다.** 하나를 건드리면 셋이 함께 영향을 받는다.

## 왜 적어 두었나

2026-11-16, 라이브가 어제 밤 커밋에 멈춘 채 오늘 커밋이 하나도 안 나갔다.
파고들어 보니 배포 정보 API 가 **200 인데 본문이 비어 있었다** —

```
GET /project/parkintaek2/seoulmarkets/stage/main/deployment/main  →  200, 본문 없음
```

대시보드가 「Cannot read properties of null (reading 'name')」을 내는 것도 그 때문이다.
즉 **Cloudtype 쪽 배포 레코드가 비어 있다.** 그런데 서비스 목록은 web 이 Running 이라고
하고 사이트도 열린다 — 옛 컨테이너가 그대로 살아 있기 때문이다.

우리 설정(`.cloudtype/app.yaml`)은 정상이고 배포 명령도 성공을 낸다. 그래도 반영되지 않는다.

## 그날 헛짚은 것 — 다음 사람은 여기서 출발한다

증상이 「빌드 메모리 부족」과 똑같이 생겼다. 그래서 차례로 이것들을 했는데 **전부 아니었다** —

1. `NODE_OPTIONS=--max-old-space-size=400` (컨테이너 0.5GB) → 그대로
2. `resources.memory` 0.5 → 1.0 → 그대로
3. 힙 400 → 820 (컨테이너에 맞춤) → 그대로
4. `.npmrc` 로 esbuild 설치 스크립트 허용 → 그대로

⭐ 2·3 은 그래도 남겼다. 지면이 16,142장이라 0.5GB 로는 어차피 빠듯하고,
  4 는 npm 11 에서 실제로 필요한 설정이다(install 스크립트 기본 차단).
  다만 **이번 멈춤의 원인은 아니었다.**

⭐ 가장 빨리 갈라낸 단서는 **「7분 만에 Running」** 이었다. 16,142장을 짓는 시간이
  아니다(우리 PC 가 3.5분). 다 짓고 죽은 것이 아니라 아예 빌드가 돌지 않은 것이다.

## 판정하는 한 줄

```
curl -s https://seoulmarkets.com/deploy-stamp.txt   →  거기 적힌 커밋이 내 HEAD 인가
```

⛔ 「Running」도 「UPDATED 시각」도 「배포했다」도 나갔다는 증거가 아니다.
  이 한 줄만이 증거다. 2026-11-16 에 그것을 믿다 네 시간을 썼다.

## 되돌리는 법

서비스를 다시 만들어야 하면, 만든 뒤 위 표의 도메인을 하나씩 다시 묶는다.
⛔ 그 작업은 세 사이트를 함께 끊을 수 있다 — 사장님 허락을 받고 한다.
