/**
 * gs-type.mjs — 구글 시트 화면에 값을 넣는 공용 손.
 *
 * 2026-11-28 에 겪은 것: 값을 넣고 Enter 를 누른 뒤 «정해 둔 시간만» 쉬고 다음 값을 넣었더니
 *   두 칸에 한 칸꼴로 입력이 사라졌다(34줄을 넣었는데 17줄만 들어갔다).
 * 그래서 시간으로 기다리지 않는다. 칸마다 «이름 상자가 그 칸을 가리키는지» 확인한 뒤에 넣고,
 *   Enter 뒤에는 «다음 칸으로 넘어갔는지» 확인한 뒤에 다음으로 간다. 확인이 안 되면 그 자리에서 멈춘다.
 */
import { 재기 } from './cdp.mjs';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const whereJs = `(() => { const n = document.querySelector('#t-name-box'); const f = document.querySelector('#t-formula-bar-input .cell-input'); const tab = document.querySelector('.docs-sheet-active-tab .docs-sheet-tab-name'); return JSON.stringify({ box: n ? n.value : null, bar: f ? f.textContent : null, tab: tab ? tab.textContent : null, tabs: [...document.querySelectorAll('.docs-sheet-tab .docs-sheet-tab-name')].map((e) => e.textContent) }); })()`;

export function 시트손(c) {
  const key = async (k, code, vk, mod = 0, extra = {}) => {
    await c.보내기('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: mod, ...extra });
    await c.보내기('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: mod });
  };
  const enter = async () => {
    await c.보내기('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
    await c.보내기('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  };
  const state = async () => JSON.parse(String(await 재기(c, whereJs, 20000)));
  /** 이름 상자가 그 칸(병합이면 그 칸으로 시작하는 범위)을 가리킬 때까지 기다린다 */
  const until = async (cell, max = 5000) => {
    const t0 = Date.now(); let s = await state();
    while (!(s.box === cell || String(s.box).startsWith(cell + ':')) && Date.now() - t0 < max) { await wait(120); s = await state(); }
    return { ok: s.box === cell || String(s.box).startsWith(cell + ':'), s };
  };
  const go = async (cell) => {
    const b = JSON.parse(String(await 재기(c, `(() => { const r = document.querySelector('#t-name-box').getBoundingClientRect(); return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2 }); })()`, 20000)));
    for (const type of ['mousePressed', 'mouseReleased']) await c.보내기('Input.dispatchMouseEvent', { type, x: b.x, y: b.y, button: 'left', clickCount: 1 });
    await wait(350); await key('a', 'KeyA', 65, 2); await c.보내기('Input.insertText', { text: cell }); await wait(250); await enter();
    const r = await until(cell, 5000); await wait(300);
    return r.s;
  };
  /**
   * 한 열을 위에서 아래로 넣는다. values[i] 가 null 이면 그 칸은 건드리지 않고 지나간다.
   * 돌려주는 것: { ok, typed, at, why }
   */
  const typeDown = async (col, startRow, values, tabName) => {
    let s = await go(col + startRow);
    if (s.tab !== tabName || !(s.box === col + startRow || String(s.box).startsWith(col + startRow + ':'))) return { ok: false, typed: 0, at: s.box, why: '첫 칸으로 가지 못했다 (' + s.tab + ' ' + s.box + ')' };
    let typed = 0;
    for (let i = 0; i < values.length; i += 1) {
      const here = col + (startRow + i); const next = col + (startRow + i + 1);
      const a = await until(here, 5000);
      if (!a.ok || a.s.tab !== tabName) return { ok: false, typed, at: a.s.box, why: here + ' 에 서지 못했다 (' + a.s.tab + ' ' + a.s.box + ')' };
      if (values[i] === null) await key('ArrowDown', 'ArrowDown', 40);
      else {
        /* 칸이 «편집 상태»가 아니면 넣은 글이 사라진다(2026-11-28 실측). F2 로 편집을 열고, 있던 글을 전부 골라 덮어쓴 뒤 Enter 로 닫는다 */
        await key('F2', 'F2', 113); await wait(220);
        await key('a', 'KeyA', 65, 2); await wait(80);
        await c.보내기('Input.insertText', { text: String(values[i]) }); await wait(150);
        await enter(); typed += 1;
      }
      const b = await until(next, 5000);
      if (!b.ok) return { ok: false, typed, at: b.s.box, why: here + ' 뒤에 ' + next + ' 로 넘어가지 않았다 (' + b.s.box + ')' };
    }
    return { ok: true, typed, at: col + (startRow + values.length) };
  };
  return { key, enter, state, until, go, typeDown, wait };
}
