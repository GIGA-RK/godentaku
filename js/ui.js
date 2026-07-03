// CALC-777 v16.0
// UI：DOM操作・描画・ボタン入力・DATA/MODE/HIST/DEBUG表示。
// ゲーム進行は main.js、確率/出目テーブルは tables.js に分離。

const $ = (id) => document.getElementById(id);

function phaseLabel() {
  if (st.sggRemain > 0) return "SGG";
  if (st.ggRemain > 0) return "GG";
  if (st.gzone > 0) return "G-ZONE";
  if (st.gstop > 0) return "G-STOP";
  if (st.gstopPre > 0) return "G-STOP前兆";
  if (st.pre > 0) return "前兆";
  return "通常";
}

function sync() {
  st.phase =
    st.gzone > 0
      ? "gzone"
      : st.gstop > 0
        ? "gstop"
        : st.gstopPre > 0
          ? "gstopPre"
          : st.ggRemain > 0
            ? st.sggRemain > 0 ? "sgg" : "gg"
            : st.pre > 0
              ? "pre"
              : "normal";
}
function histDisplay() {
  let a = st.h5.slice(-5);
  while (a.length < 5) a.push("-");
  return a.join(" ");
}

function fixedNum(n, len) {
  const max = 10 ** len - 1;
  return String(Math.min(Math.max(0, Number(n) || 0), max)).padStart(len, "0");
}
function signedNum(n, len) {
  const max = 10 ** len - 1;
  const v = Number(n) || 0;
  const abs = String(Math.min(Math.abs(v), max)).padStart(len, "0");
  return v < 0 ? `-${abs}` : abs;
}
function formatGameText() {
  return `<span class="miniLabel">G数：</span><span class="miniNum">${fixedNum(st.g, 6)}</span>`;
}
function formatCoinText() {
  const cls = st.coin < 0 ? "coinNeg" : st.coin > 0 ? "coinPos" : "coinZero";
  return `<span class="miniLabel">Coin：</span><span class="miniNum ${cls}">${signedNum(st.coin, 6)}</span>`;
}
function formatStatusText() {
  if (st.sggRemain > 0) {
    return `<span class="miniLabel">SGG:</span><span class="miniNum">${fixedNum(st.sggRemain, 3)}</span> <span class="miniLabel">GG:</span><span class="miniNum">${fixedNum(st.ggRemain, 3)}</span>`;
  }
  if (st.ggRemain > 0) {
    return `<span class="miniLabel">GG:</span><span class="miniNum">${fixedNum(st.ggRemain, 3)}</span> <span class="miniLabel">ST:</span><span class="miniNum">${fixedNum(st.stock, 3)}</span>`;
  }
  if (st.gzone > 0) {
    return `<span class="miniLabel">GZ:</span><span class="miniNum">${fixedNum(st.gzone, 3)}</span> <span class="miniLabel">ST:</span><span class="miniNum">${fixedNum(st.stock, 3)}</span>`;
  }
  if (st.gstop > 0) {
    return `<span class="miniLabel">GS:</span><span class="miniNum">${fixedNum(st.gstop, 3)}</span> <span class="miniLabel">ST:</span><span class="miniNum">${fixedNum(st.stock, 3)}</span>`;
  }
  if (st.gstopPre > 0) {
    return `<span class="miniLabel">GSP:</span><span class="miniNum">${fixedNum(st.gstopPre, 3)}</span> <span class="miniLabel">GS:</span><span class="miniNum">${fixedNum(st.gstopStock || 0, 3)}</span>`;
  }
  if ((st.gstopStockAT || 0) > 0) {
    return `<span class="miniLabel">ATGS:</span><span class="miniNum">${fixedNum(st.gstopStockAT, 3)}</span> <span class="miniLabel">GG:</span><span class="miniNum">${fixedNum(st.ggRemain, 3)}</span>`;
  }
  if ((st.gstopStock || 0) > 0) {
    return `<span class="miniLabel">GS:</span><span class="miniNum">${fixedNum(st.gstopStock, 3)}</span> <span class="miniLabel">ST:</span><span class="miniNum">${fixedNum(st.stock, 3)}</span>`;
  }
  if (st.pre > 0) {
    return `<span class="miniLabel">P:</span><span class="miniNum">${fixedNum(st.pre, 3)}</span> <span class="miniLabel">ST:</span><span class="miniNum">---</span>`;
  }
  return `<span class="miniLabel">GG:</span><span class="miniNum">---</span> <span class="miniLabel">ST:</span><span class="miniNum">---</span>`;
}
function fixedHist() {
  let a = (st.h5 || []).map(cleanHistItem).slice(-5).reverse();
  while (a.length < 5) a.push("-");
  return a.join("");
}
function histClass(x) {
  if (x === "青") return "histBlue";
  if (x === "黄") return "histYellow";
  if (x === "宝") return "histGem";
  return "";
}
function histMark(x) {
  if (x === "青" || x === "黄") return "7";
  if (x === "宝") return "◆";
  return x;
}
function fixedHistHtml() {
  // 表示だけ逆向きにする。左が最新、右が古い履歴。
  // 内部配列 st.h5 は古い→新しいのままなので、連続判定は壊さない。
  let a = (st.h5 || []).map(cleanHistItem).slice(-5).reverse();
  while (a.length < 5) a.push("-");
  return `<span class="histLabel">履歴：</span>${a
    .map((x) => `<span class="histSym ${histClass(x)}">${histMark(x)}</span>`)
    .join("")}`;
}
function fixedStatus() {
  if (st.ggRemain > 0) {
    return `GG:${fixedNum(st.ggRemain, 3)} ST:${fixedNum(st.stock, 3)}`;
  }
  if (st.gzone > 0) {
    return `GZ:${fixedNum(st.gzone, 3)} ST:${fixedNum(st.stock, 3)}`;
  }
  if (st.gstop > 0) {
    return `GS:${fixedNum(st.gstop, 3)} ST:${fixedNum(st.stock, 3)}`;
  }
  if ((st.gstopStock || 0) > 0) {
    return `GS:${fixedNum(st.gstopStock, 3)} ST:${fixedNum(st.stock, 3)}`;
  }
  if (st.pre > 0) return `P:${fixedNum(st.pre, 3)} ST:---`;
  return "GG:--- ST:---";
}
function stayStageHtml() {
  if (st.sggRemain > 0) {
    return `<span class="stageMain">SGG</span><span class="stageSub">${stageLabel()}</span>`;
  }
  if (st.ggRemain > 0) {
    return `<span class="stageMain">${stageLabel()}</span>`;
  }
  if (st.gzone > 0) {
    return '<span class="stageMain">G-ZONE</span>';
  }
  if (st.gstop > 0) {
    return '<span class="stageMain">G-STOP</span>';
  }
  if (st.gstopPre > 0) {
    return '<span class="stageMain">G-STOP</span><span class="stageSub">前兆</span>';
  }
  return `<span class="stageMain">${st.normalStage || "湖"}</span>`;
}
function reelClass(x) {
  if (["1", "3", "5", "V", "S"].includes(x)) return "reelRed";
  if (["2", "4", "6", "8"].includes(x)) return "reelYellow";
  if (x === "0") return "reelGreen";
  if (x === "7") return "reelRainbow";
  return "";
}
function reelHtml(x) {
  return `<div class="reel"><span class="reelSym ${reelClass(x)}">${x}</span></div>`;
}
function normalizeDisplayState() {
  st.mode = safeMode(st.mode);
  st.phase = st.phase || "normal";
}
function bannerInfo() {
  if (st.dummy) return { text: "", cls: "" };
  if (st.sggRemain > 0) return { text: "SGG中", cls: "bannerSGG" };
  if (st.ggRemain > 0) return { text: "GOD GAME中", cls: "bannerGG" };
  if (st.gstop > 0) return { text: "G-STOP中", cls: "bannerGStop" };
  if (st.gzone > 0) return { text: "G-ZONE中", cls: "bannerGZone" };
  return { text: "", cls: "" };
}
function render() {
  normalizeDisplayState();
  sync();
  let mi =
    st.gzone > 0
      ? M.gzone
      : st.gstop > 0 || st.gstopPre > 0
        ? M.gstop
        : st.sggRemain > 0
          ? M.sgg
          : st.ggRemain > 0
            ? M.gg
            : M[safeMode(st.mode)] || M.lowA;
  $("fr").className = "fr " + mi[1] + (st.dummy ? " dummyCalc" : "");
  $("dummyValue").textContent = st.dummyValue || "0";
  $("stageBig").innerHTML = stayStageHtml();
  $("roleBig").textContent = PAY[st.role][0];
  $("gameText").innerHTML = formatGameText();
  $("coinText").innerHTML = formatCoinText();
  $("histText").innerHTML = fixedHistHtml();
  $("statusText").innerHTML = formatStatusText();
  const bi = bannerInfo();
  $("ggBanner").textContent = bi.text;
  $("ggBanner").className = `ggBanner${bi.text ? " show " + bi.cls : ""}`;
  $("re").className = `reels${st.ggRemain > 0 ? " atActive" : ""}${st.reelAlert ? " winAlert" : ""}`;
  $("re").innerHTML = st.e.map(reelHtml).join("");
  document.body.classList.toggle("spin", st.spin);
  panel();
}
function stageLabel() {
  const names = {
    OLYMPUS: "オリンポス",
    POSEIDON: "ポセイドン",
    ZEUS: "ゼウス",
    GOD: "ゴッド",
  };
  return names[st.ggStage] || st.ggStage || "---";
}
function slumpSvg() {
  const log = st.coinLog && st.coinLog.length ? st.coinLog : [0];
  const w = 420;
  const h = 156;
  const left = 42;
  const right = 12;
  const top = 10;
  const bottom = 24;
  const plotW = w - left - right;
  const plotH = h - top - bottom;

  // 横軸: 初期は200G幅。200Gを超えたら現在G数まで右端を拡張。
  const maxGame = Math.max(200, log.length - 1, st.g || 0);
  // 縦軸: 初期は±1000枚。超えたら500枚単位で補助軸を自動調整。
  const vals = log.concat([0, -1000, 1000]);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  min = Math.min(-1000, Math.floor(min / 500) * 500);
  max = Math.max(1000, Math.ceil(max / 500) * 500);
  if (min === max) {
    min -= 1000;
    max += 1000;
  }
  const range = max - min || 1;
  const x = (game) => left + (game / maxGame) * plotW;
  const y = (v) => top + ((max - v) / range) * plotH;
  const pts = log.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const zeroY = y(0).toFixed(1);

  const xTicks = [];
  const xStep = maxGame <= 200 ? 50 : maxGame <= 1000 ? 200 : Math.ceil(maxGame / 5 / 1000) * 1000;
  for (let g = 0; g <= maxGame; g += xStep) xTicks.push(g);
  if (xTicks.at(-1) !== maxGame) xTicks.push(maxGame);

  const yTicks = [];
  const yStep = Math.max(500, Math.ceil((max - min) / 6 / 500) * 500);
  for (let v = min; v <= max; v += yStep) yTicks.push(v);
  if (!yTicks.includes(0)) yTicks.push(0);
  yTicks.sort((a, b) => a - b);

  const xGrid = xTicks
    .map((g) => {
      const xx = x(g).toFixed(1);
      return `<line class="slumpGrid" x1="${xx}" y1="${top}" x2="${xx}" y2="${h - bottom}"></line>
        <line class="slumpTick" x1="${xx}" y1="${h - bottom}" x2="${xx}" y2="${h - bottom + 4}"></line>
        <text class="slumpLabel" x="${xx}" y="${h - 8}" text-anchor="middle">${g}</text>`;
    })
    .join("");

  const yGrid = yTicks
    .map((v) => {
      const yy = y(v).toFixed(1);
      return `<line class="slumpGrid" x1="${left}" y1="${yy}" x2="${w - right}" y2="${yy}"></line>
        <line class="slumpTick" x1="${left - 4}" y1="${yy}" x2="${left}" y2="${yy}"></line>
        <text class="slumpLabel" x="${left - 7}" y="${Number(yy) + 3}" text-anchor="end">${v}</text>`;
    })
    .join("");

  return `<div class="slumpBox">
    <div class="slumpTitle"><span>スランプグラフ</span><span>現在 ${st.coin}枚 / ${st.g}G</span></div>
    <svg class="slumpSvg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-label="持ちコイン推移">
      ${xGrid}
      ${yGrid}
      <line class="slumpZero" x1="${left}" y1="${zeroY}" x2="${w - right}" y2="${zeroY}"></line>
      <line class="slumpAxis" x1="${left}" y1="${top}" x2="${left}" y2="${h - bottom}"></line>
      <line class="slumpAxis" x1="${left}" y1="${h - bottom}" x2="${w - right}" y2="${h - bottom}"></line>
      <text class="slumpUnit" x="${left}" y="${top - 3}" text-anchor="start">枚</text>
      <text class="slumpUnit" x="${w - right}" y="${h - 1}" text-anchor="end">G</text>
      <polyline class="slumpLine" points="${pts}"></polyline>
    </svg>
  </div>`;
}
function panel() {
  let p = $("pa");
  if (!st.panel) {
    p.className = "p";
    p.innerHTML = "";
    return;
  }
  p.className = "p show";
  let net = st.earn - st.spend;
  if (st.panel === "data")
    p.innerHTML = `<b>▣ DATA</b><div class="dataStats"><span>投入<b>${st.spend}</b></span><span>払出<b>${st.earn}</b></span><span>差枚<b>${net}</b></span><span>回転<b>${st.g}</b></span></div>${slumpSvg()}`;
  if (st.panel === "mode")
    p.innerHTML = `<b>▣ 状態</b><div>遊技状態: <b>${phaseLabel()}</b></div><div>内部モード: <b>${M[safeMode(st.mode)]?.[0] || st.mode}</b></div><div>ステージ: <b>${stageLabel()}</b></div><div class="small">天井まで: ${Math.max(0, CEILING_G - (st.tenjoG || 0))}G / G-STOP保持: ${st.gstopStock || 0} / AT中G-STOP: ${st.gstopStockAT || 0}</div>`;
  if (st.panel === "hist")
    p.innerHTML = `<b>▣ 履歴</b><div class="hist">${st.h.map((x) => `<div class="hrow"><span>#${x.g}</span><b>${x.e}</b><span>${x.r}/${x.k}</span><span>+${x.p}</span></div>`).join("") || '<div class="small">なし</div>'}</div>`;
  if (st.panel === "debug")
    p.innerHTML = `<b>▣ デバッグ</b>
      <div class="small">強制状態や、次ゲームの小役を指定できます。3枚役・押順系はGG中テーブル用です。</div>
      <div class="dbgSec">
        <p class="dbgTitle">強制状態</p>
        <div class="dbgBtns">
          <button class="o" data-debug="mode:lowA">低確A</button>
          <button class="o" data-debug="mode:lowB">低確B</button>
          <button class="o" data-debug="mode:normal">通常</button>
          <button class="o" data-debug="mode:prepA">天準A</button>
          <button class="o" data-debug="mode:v">V-M</button>
          <button class="o" data-debug="mode:heavenS">天短</button>
          <button class="o" data-debug="mode:heavenL">天長</button>
          <button class="o" data-debug="mode:super">超天</button>
          <button class="o" data-debug="gg">GG開始</button>
          <button class="o" data-debug="gzone">G-ZONE</button>
          <button class="o" data-debug="gstop">G-STOP</button>
          <button class="o" data-debug="tenjo">天井直前</button>
        </div>
      </div>
      <div class="dbgSec">
        <p class="dbgTitle">次ゲーム小役</p>
        <div class="dbgBtns">
          <button class="n" data-debug="role:py">押順黄7</button>
          <button class="n" data-debug="role:ub">上段青7</button>
          <button class="n" data-debug="role:mb">中段青7</button>
          <button class="n" data-debug="role:ly">下段黄7</button>
          <button class="n" data-debug="role:pry">押順右上黄7</button>
          <button class="n" data-debug="role:ry">右上黄7</button>
          <button class="n" data-debug="role:my">中段黄7</button>
          <button class="n" data-debug="role:oneB">宝石</button>
          <button class="n" data-debug="role:red7f">赤7フェイク</button>
          <button class="n" data-debug="role:red7">赤7</button>
          <button class="n" data-debug="role:god">GOD</button>
          <button class="n" data-debug="stage">ステチェン</button>
        </div>
      </div>`;
}

function toggleDummy() {
  st.dummy = !st.dummy;
  if (st.dummy) {
    stopAuto("DUMMY");
    st.dummyValue = st.dummyValue || "0";
  }
  save();
  render();
}
function dummyKey(k) {
  if (k === "−") return toggleDummy();
  if (k === "AC") {
    st.dummyValue = "0";
  } else if (/^[0-9]$/.test(k)) {
    st.dummyValue = st.dummyValue === "0" ? k : (st.dummyValue + k).slice(-12);
  } else if (k === "00") {
    st.dummyValue = st.dummyValue === "0" ? "0" : (st.dummyValue + "00").slice(-12);
  } else if (k === ".") {
    if (!st.dummyValue.includes(".")) st.dummyValue += ".";
  } else if (["+", "×", "÷", "="].includes(k)) {
    st.dummyValue = "0";
  } else if (["MODE", "DATA"].includes(k)) {
    st.dummyValue = st.dummyValue || "0";
  }
  save();
  render();
}
const AUTO_CANCEL_KEYS = new Set(["AC", "0", "00", ".", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
function isAutoCancelKey(k) {
  return AUTO_CANCEL_KEYS.has(k);
}
function key(k) {
  if (autoLeft !== 0 && isAutoCancelKey(k)) {
    stopAuto("AUTO停止 / キー操作キャンセル");
    return;
  }
  if (st.dummy) return dummyKey(k);
  if (k === "−") return toggleDummy();
  if (k === "AC") return reset();
  if (k === "MODE") st.panel = st.panel === "mode" ? null : "mode";
  else if (k === "DATA") st.panel = st.panel === "data" ? null : "data";
  else if (k === "÷") st.panel = st.panel === "hist" ? null : "hist";
  else if (k === "×") st.panel = st.panel === "debug" ? null : "debug";
  else if ("123456789".includes(k)) return auto(+k);
  else if (k === "0") return auto(10);
  else if (k === "00") return auto(100);
  else if (k === ".") return autoInfinite();
  else return spin();
  render();
}

function build() {
  let rows = [
    ["AC", "MODE", "DATA", "÷"],
    ["7", "8", "9", "×"],
    ["4", "5", "6", "−"],
    ["1", "2", "3", "+"],
    ["0", "00", ".", "="],
  ];
  $("keys").innerHTML = rows
    .flat()
    .map(
      (k) =>
        `<button class="${k === "AC" ? "d" : ["MODE", "DATA", "÷", "×", "−", "+", "="].includes(k) ? "o" : "n"}" data-k="${k}">${k}</button>`,
    )
    .join("");
  $("keys").onclick = (e) => {
    let b = e.target.closest("button");
    if (b) key(b.dataset.k);
  };
  $("pa").onclick = (e) => {
    let b = e.target.closest("button[data-debug]");
    if (b) handleDebug(b.dataset.debug);
  };
}
function bindLcdAutoStop() {
  const lcd = document.querySelector(".lcd");
  if (!lcd) return;
  let down = null;
  lcd.addEventListener(
    "pointerdown",
    (e) => {
      down = { x: e.clientX, y: e.clientY, moved: false };
    },
    { passive: true },
  );
  lcd.addEventListener(
    "pointermove",
    (e) => {
      if (!down) return;
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      if (Math.hypot(dx, dy) > 14) down.moved = true;
    },
    { passive: true },
  );
  lcd.addEventListener(
    "pointerup",
    (e) => {
      if (!down) return;
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      const isSwipe = down.moved || Math.hypot(dx, dy) > 14;
      down = null;
      if (!isSwipe && autoLeft !== 0) stopAuto("AUTO停止 / 液晶タップ");
    },
    { passive: true },
  );
  lcd.addEventListener(
    "pointercancel",
    () => {
      down = null;
    },
    { passive: true },
  );
}

load();
build();
bindLcdAutoStop();
render();
