# SeoulMarkets 도메인 연결 — 2026-11-16 16:40 적어 둠

⛔ ctype remove 는 커스텀 도메인 연결까지 가져간다. 서비스를 다시 만들면 아래 7개를 다시 붙여야 한다.
   세 사이트가 한 서버에 올라가 있다 — 백년지도 · K Culture Wire · SeoulMarkets

```
Current stage is "@parkintaek2/seoulmarkets:main"
NAME                 TYPE     APP     CONNECTED     ENTRYPOINTS                                                STATUS     
mu50ut6gd568fcd2     http     web     node:3000     https://100yearmap.com                                     bound      
mu53a7orf3e7f25a     http     web     node:3000     https://www.100yearmap.com                                 bound      
port-0               http     web     node:3000     https://port-0-web-ms8nmh0n689e433f.sel3.cloudtype.app     bound      
mu50ukcbe1714050     http     web     node:3000     https://kculturewire.com                                   bound      
mu50uosl6eac6836     http     web     node:3000     https://www.kculturewire.com                               bound      
mu50rvple34e9da5     http     web     node:3000     https://seoulmarkets.com                                   bound      
mu50u2el35270888     http     web     node:3000     https://www.seoulmarkets.com                               bound      
```
