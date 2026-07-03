// CALC-777 v16.0
// メインプログラム：状態管理・抽選処理・ゲーム進行。
// UI描画は ui.js、確率/出目テーブルは tables.js に分離。

function safeMode(mode) {
  return INTERNAL_MODES.has(mode) ? mode : "lowA";
}

function modeRoleKey(k) {
  return {
    py: "haz",
    three: "haz",
    pry: "ry",
    cry: "ry",
    rfA: "rf",
    rfB: "rf",
    red7f: "rf",
    red7Any: "red7",
  }[k] || k;
}

let st = {
  g: 0,
  coin: 0,
  spend: 0,
  earn: 0,
  mode: "lowA",
  phase: "normal",
  e: ["0", "1", "2"],
  role: "none",
  spin: false,
  panel: null,
  h: [],
  mute: true,
  h5: [],
  pre: 0,
  pending: false,
  hold: 0,
  holdReason: "mode",
  gstop: 0,
  gstopStock: 0,
  gstopStockAT: 0,
  gstopPre: 0,
  gstopPreInGG: false,
  gstopHit: false,
  gstopInGG: false,
  tenjoG: 0,
  note: "",
  ggRemain: 0,
  sggRemain: 0,
  stock: 0,
  gzone: 0,
  lastLoop: "-",
  ggStage: "OLYMPUS",
  normalStage: "湖",
  stageGames: 0,
  forceRole: null,
  dummy: false,
  dummyValue: "0",
  delayed: false,
  reelAlert: false,
  coinLog: [0],
};
let autoLeft = 0;
const AUTO_NEXT_DELAY = 520;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
function pw(a) {
  let t = a.reduce((s, i) => s + i.w, 0),
    r = Math.random() * t;
  for (const i of a) {
    r -= i.w;
    if (r <= 0) return i.v;
  }
  return a.at(-1).v;
}
function one(inv) {
  return Math.random() < 1 / inv;
}
function eyes(s) {
  return s.split("");
}
function dist(o) {
  return pw(Object.entries(o).map(([v, w]) => ({ v, w })));
}
function bad7(c) {
  return c[0] === "7" && c[1] === "7" && c !== "777";
}
function isOddWin(c) {
  return ODD_WIN.has(c);
}
function normalWinEye(reason = "mode", sets = 1) {
  if (reason === "v" || sets >= 3) return eyes("VVV");
  return eyes(pick(["111", "333", "555"]));
}
function childRole(ch) {
  if (!ch) return "none";
  if (ch.role) return ch.role;
  if (["ub", "mb"].includes(ch.k)) return "replay";
  if (["ly", "ry", "cry", "my"].includes(ch.k)) return "yellow";
  if (["oneA", "oneB", "oneC", "rf", "rfA", "rfB", "red7f"].includes(ch.k)) return "chance";
  if (["red7", "red7m", "red7Any", "sp"].includes(ch.k)) return "red7";
  if (ch.k === "god") return "god";
  return "none";
}
function childPay(ch) {
  if (!ch) return 0;
  if (typeof ch.pay === "number") return ch.pay;
  if (["ly", "ry", "cry", "my"].includes(ch.k)) return 8;
  if (["oneA", "oneB", "oneC", "rf", "rfA", "rfB", "red7f"].includes(ch.k)) return 1;
  if (["red7", "red7m", "red7Any", "sp"].includes(ch.k)) return 80;
  if (ch.k === "god") return 120;
  return 0;
}
function stopAuto(msg) {
  if (autoLeft !== 0) {
    autoLeft = 0;
    if (msg) st.note = msg;
    render();
  }
}
function autoStop(res, code) {
  if (!res) return false;
  const branch = res.branch || "";
  const activeStockMode = ["gg", "sgg", "gstop"].includes(branch);
  const stockLike =
    !!res.hit &&
    (
      (res.sets || 0) > 0 ||
      res.startSGG ||
      res.resetSGG ||
      res.keepGStop ||
      res.endGStop ||
      res.gstopNow
    );

  // AT中・SGG中・G-STOP中の上乗せ/ストックではAUTO停止しない。
  if (activeStockMode && stockLike) return false;

  // 通常時などのG-STOP当選、G-STOP開始告知、確定役、当選告知では停止。
  if (res.gstopNow || res.startGStop || res.direct || res.autoStop) return true;

  // 念のため、液晶上の明確な告知出目でも停止。ただし上の除外を優先する。
  return ["777", "SSS", "VVV"].includes(code) || isOddWin(code);
}

function stage(reason) {
  st.ggStage =
    reason === "god"
      ? "GOD"
      : st.stock >= 3
        ? "ZEUS"
        : st.stock >= 1
          ? "POSEIDON"
          : "OLYMPUS";
}
function normalStageForMode(mode) {
  const tbl = {
    lowA: [
      { v: "湖", w: 38 },
      { v: "庭園", w: 32 },
      { v: "遺跡", w: 25 },
      { v: "山", w: 4 },
      { v: "神殿", w: 1 },
    ],
    lowB: [
      { v: "湖", w: 24 },
      { v: "庭園", w: 34 },
      { v: "遺跡", w: 32 },
      { v: "山", w: 8 },
      { v: "神殿", w: 2 },
    ],
    normal: [
      { v: "湖", w: 12 },
      { v: "庭園", w: 24 },
      { v: "遺跡", w: 42 },
      { v: "山", w: 17 },
      { v: "神殿", w: 5 },
    ],
    prepA: [
      { v: "湖", w: 4 },
      { v: "庭園", w: 8 },
      { v: "遺跡", w: 28 },
      { v: "山", w: 50 },
      { v: "神殿", w: 10 },
    ],
    v: [
      { v: "湖", w: 3 },
      { v: "庭園", w: 6 },
      { v: "遺跡", w: 21 },
      { v: "山", w: 35 },
      { v: "神殿", w: 35 },
    ],
    heavenS: [
      { v: "湖", w: 2 },
      { v: "庭園", w: 4 },
      { v: "遺跡", w: 14 },
      { v: "山", w: 28 },
      { v: "神殿", w: 52 },
    ],
    heavenL: [
      { v: "湖", w: 1 },
      { v: "庭園", w: 3 },
      { v: "遺跡", w: 10 },
      { v: "山", w: 26 },
      { v: "神殿", w: 60 },
    ],
    super: [
      { v: "湖", w: 1 },
      { v: "庭園", w: 2 },
      { v: "遺跡", w: 7 },
      { v: "山", w: 20 },
      { v: "神殿", w: 70 },
    ],
  };
  return pw(tbl[mode] || tbl.lowA);
}
function maybeStageChange(force = false, mode = st.mode) {
  if (st.ggRemain > 0 || st.gzone > 0 || st.gstop > 0) return;
  st.stageGames = Number(st.stageGames) || 0;
  if (force || st.stageGames <= 0 || Math.random() < 0.07) {
    st.normalStage = normalStageForMode(mode);
    st.stageGames = Math.floor(8 + Math.random() * 25);
  } else {
    st.stageGames--;
  }
}
function groupEye(group) {
  return pick(EYE_GROUPS[group] || EYE_GROUPS.basic);
}
function isBlockedNormalEye(s) {
  if (["070", "707"].includes(s)) return true;
  if (s[0] === "7" && s[2] === "7" && s !== "777") return true;
  return REACH.includes(s) || bad7(s) || isOddWin(s) || ["777", "SSS", "VVV"].includes(s);
}
function weightedModeEye(mode = st.mode) {
  // 低確〜通常では強示唆目を出さない。
  // 0ハサミ/V/7絡み/奇数順目は天国準備以上から段階的に解禁する。
  const tables = {
    lowA: [
      { v: "basic", w: 79 },
      { v: "oddOnly", w: 16 },
      { v: "leftEvenKetsu", w: 4 },
      { v: "evenSeq", w: 1 },
    ],
    lowB: [
      { v: "basic", w: 68 },
      { v: "oddOnly", w: 19 },
      { v: "leftEvenKetsu", w: 10 },
      { v: "evenSeq", w: 2.5 },
      { v: "leftOddKetsu", w: 0.5 },
    ],
    normal: [
      { v: "basic", w: 54 },
      { v: "oddOnly", w: 22 },
      { v: "leftEvenKetsu", w: 17 },
      { v: "evenSeq", w: 5 },
      { v: "leftOddKetsu", w: 2 },
    ],
    prepA: [
      { v: "basic", w: 35 },
      { v: "oddOnly", w: 17 },
      { v: "leftEvenKetsu", w: 18 },
      { v: "evenSeq", w: 13 },
      { v: "leftOddKetsu", w: 8 },
      { v: "zeroSand", w: 2.5 },
      { v: "oddSand", w: 2.5 },
      { v: "vHint", w: 1.2 },
      { v: "sevenHint", w: 1 },
      { v: "oddSeq", w: 0.7 },
      { v: "vStrong", w: 0.1 },
    ],
    v: [
      { v: "basic", w: 18 },
      { v: "oddOnly", w: 10 },
      { v: "leftEvenKetsu", w: 12 },
      { v: "evenSeq", w: 9 },
      { v: "leftOddKetsu", w: 8 },
      { v: "zeroSand", w: 2 },
      { v: "oddSand", w: 3 },
      { v: "vHint", w: 26 },
      { v: "vStrong", w: 11 },
      { v: "sevenHint", w: 0.6 },
      { v: "oddSeq", w: 0.4 },
    ],
    heavenS: [
      { v: "basic", w: 22 },
      { v: "oddOnly", w: 13 },
      { v: "leftEvenKetsu", w: 12 },
      { v: "evenSeq", w: 11 },
      { v: "leftOddKetsu", w: 12 },
      { v: "zeroSand", w: 5 },
      { v: "oddSand", w: 7 },
      { v: "vHint", w: 6 },
      { v: "vStrong", w: 4 },
      { v: "sevenHint", w: 3 },
      { v: "oddSeq", w: 3 },
      { v: "sevenStrong", w: 0.05 },
    ],
    heavenL: [
      { v: "basic", w: 17 },
      { v: "oddOnly", w: 11 },
      { v: "leftEvenKetsu", w: 10 },
      { v: "evenSeq", w: 11 },
      { v: "leftOddKetsu", w: 13 },
      { v: "zeroSand", w: 7 },
      { v: "oddSand", w: 8 },
      { v: "vHint", w: 7 },
      { v: "vStrong", w: 5 },
      { v: "sevenHint", w: 4 },
      { v: "oddSeq", w: 4 },
      { v: "sevenStrong", w: 0.1 },
    ],
    super: [
      { v: "basic", w: 10 },
      { v: "oddOnly", w: 8 },
      { v: "leftEvenKetsu", w: 7 },
      { v: "evenSeq", w: 8 },
      { v: "leftOddKetsu", w: 12 },
      { v: "zeroSand", w: 8 },
      { v: "oddSand", w: 12 },
      { v: "vHint", w: 7 },
      { v: "vStrong", w: 8 },
      { v: "sevenHint", w: 7 },
      { v: "oddSeq", w: 6 },
      { v: "sevenStrong", w: 7 },
    ],
  };
  return groupEye(pw(tables[mode] || tables.lowA));
}
function cand(mode = st.mode) {
  return weightedModeEye(mode);
}
function nEye(mode = st.mode) {
  let s,
    l = 0;
  do {
    s = cand(mode);
    l++;
  } while (isBlockedNormalEye(s) && l < 80);
  return eyes(!isBlockedNormalEye(s) ? s : "153");
}
function consumeForcedRole(list) {
  if (!st.forceRole) return null;
  let key = st.forceRole;
  let forced = list.find((r) => r.k === key);

  // AT専用の押し順役を通常時に強制した場合は、通常時相当の黄7として処理。
  // forceRoleが残り続けて、後の履歴が変になるのを防ぐ。
  if (!forced && list === R) {
    const fallback = { py: "ly", pry: "ry", cry: "cry", red7m: "red7" }[key];
    if (fallback) forced = list.find((r) => r.k === fallback);
  }

  st.forceRole = null;
  return forced || null;
}
function drawRole() {
  return consumeForcedRole(R) || pw(R.map((r) => ({ v: r, w: 1 / r.inv })));
}
function drawATRole() {
  return consumeForcedRole(AT_R) || pw(AT_R.map((r) => ({ v: r, w: 1 / r.inv })));
}
function drawSGGRole() {
  const forced = consumeForcedRole(SGG_R);
  if (forced) return forced;

  let r = Math.random();
  let c = 0;
  for (const role of SGG_DIRECT_R) {
    c += 1 / role.inv;
    if (r < c) return role;
  }

  // 赤7系/GOD以外は既存のSGG用通常小役テーブルから選ぶ。
  // ここは後でCSV化しやすいようにSGG_COMMON_Rへ分離しておく。
  return pw(SGG_COMMON_R.map((role) => ({ v: role, w: 1 / role.inv })));
}
function histSym(ch) {
  if (["ub", "mb"].includes(ch.k)) return "青";
  if (["py", "ly", "ry", "pry", "cry", "my"].includes(ch.k)) return "黄";
  if (["oneB", "oneC", "rf", "rfA", "rfB"].includes(ch.k)) return "宝";
  return "-";
}
function cleanHistItem(x) {
  return ["青", "黄", "宝"].includes(x) ? x : "-";
}
function tail(x) {
  let n = 0;
  for (let i = st.h5.length - 1; i >= 0; i--) {
    if (st.h5[i] === x) n++;
    else break;
  }
  return n;
}
function updH(ch) {
  st.h5 = (st.h5 || []).map(cleanHistItem);
  st.h5.push(cleanHistItem(histSym(ch)));
  st.h5 = st.h5.slice(-5);
  return {
    b: tail("青"),
    y: tail("黄"),
    gem: st.h5.filter((x) => x === "宝").length,
  };
}
function rollGG(ch) {
  if (["god", "red7", "sp"].includes(ch.k)) return true;
  let inv = GG[st.mode] || 999999;
  if (ch.k === "my")
    inv = Math.min(
      inv,
      st.mode === "super"
        ? 2.5
        : ["heavenS", "heavenL"].includes(st.mode)
          ? 5
          : 80,
    );
  if (ch.k === "mb")
    inv = Math.min(
      inv,
      st.mode === "super"
        ? 3
        : ["heavenS", "heavenL"].includes(st.mode)
          ? 7
          : 130,
    );
  if (["ry", "cry"].includes(ch.k))
    inv = Math.min(
      inv,
      st.mode === "super"
        ? 4
        : ["heavenS", "heavenL"].includes(st.mode)
          ? 12
          : 220,
    );
  return one(inv);
}
const T = {
  lowA: {
    haz: { lowA: 99.8, lowB: 0.17, normal: 0.02 },
    ub: { lowA: 99.8, lowB: 0.17, normal: 0.02 },
    mb: { lowA: 66, lowB: 29, normal: 3, prepA: 1, heavenS: 0.1 },
    ry: { lowA: 78, lowB: 21, normal: 0.8, prepA: 0.2 },
    my: { lowB: 68, normal: 25, prepA: 6, heavenS: 1 },
    sp: { heavenL: 50, super: 50 },
  },
  lowB: {
    haz: { lowA: 0.1, lowB: 99.7, normal: 0.2 },
    ub: { lowA: 0.1, lowB: 99.7, normal: 0.2 },
    mb: { lowB: 67, normal: 31, prepA: 2 },
    ry: { lowB: 78, normal: 21, prepA: 1 },
    my: { normal: 75, prepA: 23, heavenS: 2 },
    sp: { heavenL: 50, super: 50 },
  },
  normal: {
    haz: { lowA: 0.2, lowB: 0.05, normal: 99.6, prepA: 0.17 },
    ub: { lowA: 0.2, lowB: 0.05, normal: 99.6, prepA: 0.17 },
    mb: { normal: 67, prepA: 32, heavenS: 0.4, heavenL: 0.05 },
    ry: { normal: 78, prepA: 22, heavenS: 0.1 },
    my: { prepA: 92, heavenS: 6, heavenL: 1, super: 0.2 },
    sp: { heavenL: 50, super: 50 },
  },
  prepA: {
    haz: { lowA: 0.8, lowB: 0.1, normal: 0.1, prepA: 98.9, heavenS: 0.1 },
    ub: { lowA: 0.8, lowB: 0.1, normal: 0.1, prepA: 98.9, heavenS: 0.1 },
    mb: { prepA: 67, heavenS: 33, heavenL: 0.2 },
    ry: { prepA: 84, heavenS: 15, heavenL: 0.1 },
    my: { prepA: 25, heavenS: 73, heavenL: 1.6, super: 0.4 },
    sp: { heavenL: 50, super: 50 },
  },
  v: {
    haz: { lowA: 2.7, lowB: 0.4, normal: 0.2, prepA: 0.1, v: 96.6 },
    ub: { lowA: 2.7, lowB: 0.4, normal: 0.2, prepA: 0.1, v: 96.6 },
  },
  heavenS: {
    haz: {
      lowA: 2.7,
      lowB: 0.4,
      normal: 0.2,
      prepA: 0.1,
      heavenS: 96.5,
      heavenL: 0.1,
    },
    ub: {
      lowA: 2.7,
      lowB: 0.4,
      normal: 0.2,
      prepA: 0.1,
      heavenS: 96.5,
      heavenL: 0.1,
    },
    mb: { heavenS: 97, heavenL: 3 },
    ry: { heavenS: 98.8, heavenL: 1.2 },
    my: { heavenS: 75, heavenL: 23, super: 2 },
  },
  heavenL: {
    haz: { heavenS: 1.7, heavenL: 98.3 },
    ub: { heavenS: 1.7, heavenL: 98.3 },
    mb: { heavenL: 94, super: 6 },
    ry: { heavenL: 98, super: 2 },
    my: { heavenL: 75, super: 25 },
  },
  super: {
    haz: { heavenL: 17.5, super: 82.5 },
    ub: { heavenL: 17.5, super: 82.5 },
  },
};
function trans(ch) {
  let tbl = T[st.mode] && T[st.mode][ch.k];
  return tbl ? dist(tbl) : st.mode;
}
function lotteryPercent(p) {
  return Math.random() < p / 100;
}
function setHit(res, sets, reason, note) {
  res.hit = true;
  res.sets = sets;
  res.reason = reason;
  res.note = note;
}
function forceOddWinIfNeeded(res, reason = "odd") {
  const code = res.e.join("");
  if (!res.hit && !res.direct && isOddWin(code)) {
    res.hit = true;
    res.direct = true;
    res.sets = 1;
    res.reason = reason;
    if (!res.role || res.role === "none") res.role = "ggwin";
    res.pay = Math.max(res.pay || 0, 30);
    res.note = `${code} 奇数揃い / GG当選`;
    res.autoStop = true;
  }
  return res;
}
function addGStopStock(note) {
  st.gstopStock = (st.gstopStock || 0) + 1;
  st.note = note;
}
function addGStopStockAT(note) {
  st.gstopStockAT = (st.gstopStockAT || 0) + 1;
  st.note = note;
}
function startGStop(note) {
  const inGG = !!st.gstopPreInGG || st.ggRemain > 0;
  if (inGG && (st.gstopStockAT || 0) > 0) {
    st.gstopStockAT--;
  } else if ((st.gstopStock || 0) > 0) {
    st.gstopStock--;
  }
  st.gstopPre = 0;
  st.gstopPreInGG = false;
  st.gstopInGG = inGG;
  st.sggRemain = 0;
  st.gstop = 5;
  st.gstopHit = false;
  st.gzone = 0;
  st.phase = "gstop";
  const rest = inGG ? st.gstopStockAT || 0 : st.gstopStock || 0;
  st.note = note || `G-STOP開始 / 残${rest}`;
}
function startGStopPre(note, inGG = false) {
  const atRelease = !!inGG || (st.ggRemain > 0 && (st.gstopStockAT || 0) > 0);
  const stock = atRelease ? (st.gstopStockAT || 0) : (st.gstopStock || 0);
  if (stock <= 0 || st.gstop > 0 || st.gstopPre > 0 || st.gzone > 0) return;
  if (st.ggRemain > 0 && !atRelease) return;
  st.gstopPre = pw([
    { v: 3, w: 45 },
    { v: 4, w: 35 },
    { v: 5, w: 20 },
  ]);
  st.gstopPreInGG = atRelease;
  st.phase = "gstopPre";
  st.note = (note || (atRelease ? "AT中G-STOP前兆" : "G-STOP前兆")) + ` / ${st.gstopPre}G`;
}
function applyNormalHistory(res, h) {
  // 青7履歴: 3連はG-STOP抽選、4連はG-STOP確定、5連以降はGG+G-STOP。
  // 抽選は1Gにつき1回なので、同系列は 5連 > 4連 > 3連 の優先順で判定。
  if (h.b >= 5) {
    addGStopStock(`青7 ${h.b}連 / G-STOP保持`);
    setHit(res, 1, "blue5", `青7 ${h.b}連 / GG+G-STOP`);
    return;
  }
  if (h.b === 4) {
    addGStopStock("青7 4連 / G-STOP確定");
    res.gstopNow = true;
    res.note = "青7 4連 / G-STOP確定";
    return;
  }
  if (h.b === 3) {
    if (lotteryPercent(SETTING <= 2 ? 5 : SETTING === 3 ? 7.5 : SETTING === 4 ? 12.5 : SETTING === 5 ? 15 : 20)) {
      addGStopStock("青7 3連 / G-STOP当選");
      res.gstopNow = true;
      res.note = "青7 3連 / G-STOP当選";
    } else {
      res.note = "青7 3連 / G-STOP抽選";
    }
  }

  // 黄7履歴: 3連はGG抽選、4連以降はGG確定。
  if (h.y >= 4) {
    setHit(res, 1, "yellow4", `黄7 ${h.y}連`);
    return;
  }
  if (h.y === 3 && lotteryPercent(SETTING <= 2 ? 20 : SETTING === 3 ? 22.5 : SETTING === 4 ? 25 : SETTING === 5 ? 30 : 33.3)) {
    setHit(res, 1, "yellow3", "黄7 3連 / GG当選");
    return;
  }

  // 宝石履歴: 5G以内の個数で抽選。2個12.5%、3個50%、4個以上確定。
  if (h.gem >= 4) {
    setHit(res, 1, "gem4", `宝石${h.gem}個`);
  } else if (h.gem === 3 && lotteryPercent(50)) {
    setHit(res, 1, "gem3", "宝石3個 / GG当選");
  } else if (h.gem === 2 && lotteryPercent(12.5)) {
    setHit(res, 1, "gem2", "宝石2個 / GG当選");
  }
}
function loopRate(reason) {
  return reason === "god"
    ? pw([
        { v: 0.01, w: 50 },
        { v: 0.25, w: 35 },
        { v: 0.5, w: 12 },
        { v: 0.66, w: 2 },
        { v: 0.75, w: 1 },
      ])
    : reason === "tenjo"
      ? pw([
          { v: 0.01, w: 50 },
          { v: 0.8, w: 50 },
        ])
      : reason === "red7"
        ? pw([
            { v: 0.01, w: 75 },
            { v: 0.25, w: 18 },
            { v: 0.5, w: 6 },
            { v: 0.66, w: 1 },
          ])
        : pw([
            { v: 0.01, w: 85 },
            { v: 0.25, w: 12 },
            { v: 0.5, w: 2.5 },
            { v: 0.66, w: 0.5 },
          ]);
}
function rollLoop(r) {
  let add = 0;
  while (Math.random() < r && add < 20) add++;
  return add;
}
function startGG(base, reason) {
  let r = loopRate(reason),
    ex = rollLoop(r);
  st.stock += Math.max(0, base - 1) + ex;
  st.ggRemain = 100;
  st.sggRemain = reason === "red7" ? 16 : 0;
  st.gstop = 0;
  st.gstopHit = false;
  st.gstopInGG = false;
  st.gzone = 0;
  st.tenjoG = 0;
  st.mode = safeMode(st.mode);
  st.phase = reason === "red7" ? "sgg" : "gg";
  st.lastLoop = Math.round(r * 100) + "%";
  stage(reason);
  st.note = reason === "red7" ? `SGG開始 ${base}set + loop${ex} / ${st.lastLoop}` : `GG開始 ${base}set + loop${ex} / ${st.lastLoop}`;
}
function endGG() {
  if (st.stock > 0) {
    st.stock--;
    st.ggRemain = 100;
    stage("continue");
    st.note = "GG継続";
  } else {
    // G-STOP保持があっても、G-ZONEを先に消化する。
    st.phase = "gzone";
    st.gzone = 5;
    st.ggRemain = 0;
    st.sggRemain = 0;
    st.gstopInGG = false;
    st.note = "G-ZONE開始";
  }
}
function startPre(sets, reason, n) {
  if (st.pending) return;
  st.pre = pw([
    { v: 3, w: 8 },
    { v: 5, w: 12 },
    { v: 7, w: 18 },
    { v: 9, w: 18 },
    { v: 12, w: 15 },
    { v: 16, w: 12 },
    { v: 24, w: 10 },
    { v: 32, w: 7 },
  ]);
  st.phase = "pre";
  st.pending = true;
  st.hold = sets;
  st.holdReason = reason;
  st.note = n + " / 前兆" + st.pre + "G";
}
function genNormal(forceCeiling = false) {
  let ch = drawRole(),
    h = updH(ch),
    res = { role: childRole(ch), e: nEye(), pay: childPay(ch), note: ch.n, child: ch.k };
  if (ch.k === "god")
    return {
      role: "god",
      e: ["7", "7", "7"],
      pay: 120,
      note: "GOD",
      child: ch.k,
      hit: true,
      direct: true,
      sets: 5,
      reason: "god",
    };
  if (["red7", "red7m", "sp"].includes(ch.k))
    return {
      role: "red7",
      e: ["S", "S", "S"],
      pay: 80,
      note: "赤7/S",
      child: ch.k,
      hit: true,
      direct: true,
      sets: 1,
      reason: "red7",
    };

  applyNormalHistory(res, h);
  if (!res.hit && res.gstopNow) {
    res.e = eyes(pick(h.b >= 4 ? EYE_GROUPS.gstopStrong : EYE_GROUPS.gstopWeak));
  }

  if (!res.hit && forceCeiling) {
    setHit(res, 1, "tenjo", `天井${CEILING_G}G`);
  }
  if (!res.hit && rollGG(ch)) {
    res.hit = true;
    res.sets = 1;
    res.reason = "mode";
    res.note = ch.n + " / GG当選";
  }
  if (res.hit) {
    // 通常時からの当選は前兆を経て、最終的に奇数/V揃いで告知する。
    // 当選ゲーム自体にリーチ目を強制表示しない。
    res.e = res.e || nEye();
  }
  return res;
}
function genPre() {
  // 前兆中も小役履歴は通常どおり進める。
  // 旧版では前兆中にdrawRole/updHを通していなかったため、
  // 履歴が止まったり、強制役が次ゲームへ残って履歴表示が崩れることがあった。
  const ch = drawRole();
  updH(ch);

  let baseRole = childRole(ch);
  let basePay = childPay(ch);

  // 前兆中のGOD/赤7は割り込み当選として扱う。
  if (ch.k === "god")
    return {
      role: "god",
      e: ["7", "7", "7"],
      pay: 120,
      note: "前兆中 GOD",
      hit: true,
      direct: true,
      sets: 5,
      reason: "god",
      autoStop: true,
    };
  if (["red7", "sp"].includes(ch.k))
    return {
      role: "red7",
      e: ["S", "S", "S"],
      pay: 80,
      note: "前兆中 赤7/S",
      hit: true,
      direct: true,
      sets: 1,
      reason: "red7",
      autoStop: true,
    };

  if (st.pre <= 1)
    return {
      role: baseRole,
      e: normalWinEye(st.holdReason, st.hold),
      pay: basePay,
      note: "前兆最終 / GG告知 / " + ch.n,
      autoStop: true,
    };

  let r = Math.random();
  if (r < 0.25)
    return { role: baseRole, e: eyes(pick(CH)), pay: basePay, note: "前兆中 / " + ch.n };
  if (r < 0.38)
    return { role: baseRole, e: eyes(pick(REACH)), pay: basePay, note: "前兆中 / " + ch.n };
  return { role: baseRole, e: nEye(), pay: basePay, note: "前兆中 / " + ch.n };
}
function genGStopPre() {
  const ch = drawRole();
  updH(ch);
  const baseRole = childRole(ch);
  const basePay = childPay(ch);

  // 前兆中でも確定役はそのまま割り込み。
  if (ch.k === "god")
    return {
      role: "god",
      e: ["7", "7", "7"],
      pay: 120,
      note: "G-STOP前兆中 GOD",
      hit: true,
      direct: true,
      sets: 5,
      reason: "god",
      autoStop: true,
    };
  if (["red7", "red7m", "sp"].includes(ch.k))
    return {
      role: "red7",
      e: ["S", "S", "S"],
      pay: 80,
      note: "G-STOP前兆中 赤7/S",
      hit: true,
      direct: true,
      sets: 1,
      reason: "red7",
      autoStop: true,
    };

  if (st.gstopPre <= 1)
    return {
      role: baseRole,
      e: ["0", "0", "0"],
      pay: basePay,
      note: "0揃い / G-STOP告知 / " + ch.n,
      startGStop: true,
      autoStop: true,
    };

  const tease = [...EYE_GROUPS.gstopWeak, ...EYE_GROUPS.gstopStrong];
  return {
    role: baseRole,
    e: Math.random() < 0.45 ? eyes(pick(tease)) : nEye(),
    pay: basePay,
    note: "G-STOP前兆 / " + ch.n,
  };
}
function ggModeStockPercent(k, mode) {
  // GG中の上乗せ抽選は簡易版。
  // 5号機凱旋の解析値に合わせ、15枚ベルは薄く、ハズレ/特殊SPは強め。
  if (k === "py") return 0.1;
  if (k === "haz") return mode === "super" ? 50 : 10;
  if (k === "sp") return ["heavenL", "super"].includes(mode) ? 100 : 50;
  if (k === "my") return mode === "super" ? 75 : ["heavenS", "heavenL"].includes(mode) ? 25 : 3.13;
  if (k === "cry") return mode === "super" ? 50 : ["heavenS", "heavenL"].includes(mode) ? 10 : 1.56;
  if (k === "pry") return mode === "super" ? 25 : SETTING <= 3 ? 0.01 : SETTING === 4 ? 0.05 : SETTING === 5 ? 0.24 : 0.49;
  if (k === "mb") return ["heavenS", "heavenL"].includes(mode) ? 0.39 : mode === "super" ? 25 : 0.1;
  return 0;
}
function setGGStock(res, sets, reason, note) {
  res.hit = true;
  res.sets = sets;
  res.reason = reason;
  res.note = note;
  res.e = eyes(pick(REACH));
  res.autoStop = true;
}
function sggMissEye() {
  // SGG中の出目は通常/AT時と同じ扱い。S図柄は使わない。
  return nEye();
}
function sggStockPercent(k) {
  // SGG中の液晶S揃いは、赤7本当選などの「SGG当選告知」用。
  // 3枚役・押し順黄7・青7などの通常小役ではSを揃えない。
  if (["red7", "red7m"].includes(k)) return 100;
  if (["red7f"].includes(k)) return 0;
  return 0;
}
function setSGGStock(res, note) {
  res.hit = true;
  res.sets = 1;
  res.reason = "sggRole";
  res.note = note;
  res.e = ["S", "S", "S"];
  res.autoStop = true;
}
function genSGG() {
  const ch = drawSGGRole();
  updH(ch);
  const res = {
    role: childRole(ch),
    e: nEye(),
    pay: childPay(ch),
    note: "SGG中 " + ch.n,
    child: ch.k,
  };

  if (ch.k === "god")
    return {
      role: "god",
      e: ["7", "7", "7"],
      pay: 120,
      note: "SGG中 GOD",
      hit: true,
      sets: 5,
      reason: "god",
      autoStop: true,
    };

  if (["red7", "red7m"].includes(ch.k))
    return {
      role: "red7",
      e: ["S", "S", "S"],
      pay: 80,
      note: "SGG中 赤7 / S揃い / 16G再セット",
      hit: true,
      sets: 1,
      reason: "red7",
      resetSGG: true,
      autoStop: true,
    };

  if (ch.k === "red7f") {
    res.e = nEye();
    res.note = "SGG中 赤7フェイク";
    return res;
  }

  const p = sggStockPercent(ch.k);
  if (p > 0 && lotteryPercent(p)) {
    setSGGStock(res, `SGG中 ${ch.n} / 上乗せ`);
  }
  return res;
}
function genGG() {
  let ch = drawATRole(),
    h = updH(ch),
    res = {
      role: ch.role || "none",
      e: nEye(),
      pay: ch.pay || 0,
      note: "GG中 " + ch.n,
      child: ch.k,
    };
  if (ch.k === "god")
    return {
      role: "god",
      e: ["7", "7", "7"],
      pay: 120,
      note: "GG中 GOD",
      hit: true,
      autoStop: true,
      sets: 5,
      reason: "god",
    };
  if (["red7", "red7m", "sp"].includes(ch.k))
    return {
      role: "red7",
      e: ["S", "S", "S"],
      pay: 80,
      note: "GG中 赤7/S / SGG開始",
      hit: true,
      autoStop: true,
      sets: 1,
      reason: "red7",
      startSGG: true,
    };

  // GG中履歴抽選:
  // 青7 5連以上はG-STOP、黄7 5連以上はGGストック。
  // 5連を超えて黄7/青7が続いた場合も、継続分として毎ゲーム抽選/保持させる。
  if (h.b >= 5) {
    addGStopStockAT(`GG中 青7 ${h.b}連 / AT中G-STOP保持`);
    res.autoStop = true;
    res.gstopNow = true;
    res.note = `GG中 青7 ${h.b}連 / AT中G-STOPストック`;
  }
  if (h.y >= 5) {
    setGGStock(res, 1, "ggYellow5", `GG中 黄7 ${h.y}連 / GGストック`);
    return res;
  }
  if (h.gem >= 4) {
    setGGStock(res, 1, "ggGem4", `GG中 宝石${h.gem}個 / GGストック`);
    return res;
  }
  if (h.gem === 3 && lotteryPercent(50)) {
    setGGStock(res, 1, "ggGem3", "GG中 宝石3個 / GG当選");
    return res;
  }
  if (h.gem === 2 && lotteryPercent(12.5)) {
    setGGStock(res, 1, "ggGem2", "GG中 宝石2個 / GG当選");
    return res;
  }

  const p = ggModeStockPercent(ch.k, st.mode);
  if (p > 0 && lotteryPercent(p)) {
    setGGStock(res, 1, "ggRole", `GG中 ${ch.n} / 上乗せ`);
  }
  return res;
}
function resumeGGFromGStop(note) {
  st.gstop = 0;
  st.gstopHit = false;
  st.gstopInGG = false;
  st.phase = st.sggRemain > 0 ? "sgg" : st.ggRemain > 0 ? "gg" : "normal";
  st.note = note || "G-STOP終了 / GG再開";
}
function genGZ() {
  let r = Math.random();
  if (r < 0.06)
    return {
      role: "none",
      e: eyes(pick(["135", "315", "V31", "V34", ...REACH.slice(0, 10)])),
      hit: true,
      sets: 1,
      reason: "gzone",
      pay: 0,
      note: "G-ZONE 当選",
      autoStop: true,
    };
  if (r < 0.14) {
    let d = pick(["1", "3", "5"]);
    return {
      role: "none",
      e: [d, d, d],
      hit: true,
      sets: 1,
      reason: "gzone",
      pay: 0,
      note: "G-ZONE 奇数",
      autoStop: true,
    };
  }
  if (r < 0.17)
    return {
      role: "none",
      e: ["V", "V", "V"],
      hit: true,
      sets: 3,
      reason: "v",
      pay: 0,
      note: "G-ZONE V",
      autoStop: true,
    };
  if (r < 0.18)
    return {
      role: "god",
      e: ["7", "7", "7"],
      hit: true,
      sets: 5,
      reason: "god",
      pay: 0,
      note: "G-ZONE 777",
      autoStop: true,
    };
  return { role: "none", e: eyes(pick(GZ)), pay: 0, note: "G-ZONE中" };
}
function gstopMissEye() {
  return eyes(pick(Math.random() < 0.5 ? GS_MISS_7 : GS_MISS_S));
}
function genGS() {
  let r = Math.random();
  if (r < 0.012)
    return {
      role: "god",
      e: ["7", "7", "7"],
      pay: 30,
      note: "G-STOP 777",
      hit: true,
      sets: 5,
      reason: "god",
      endGStop: true,
      autoStop: true,
    };
  if (r < 0.022)
    return {
      role: "red7",
      e: ["S", "S", "S"],
      pay: 30,
      note: "G-STOP S揃い",
      hit: true,
      sets: 1,
      reason: "red7",
      endGStop: true,
      autoStop: true,
    };
  if (r < 0.052)
    return {
      role: "gstop",
      e: ["V", "V", "V"],
      pay: 30,
      note: "G-STOP V揃い",
      hit: true,
      sets: 3,
      reason: "v",
      endGStop: true,
      autoStop: true,
    };
  if (r < 0.142) {
    let d = pick(["1", "3", "5"]);
    return {
      role: "gstop",
      e: [d, d, d],
      pay: 30,
      note: "G-STOP 奇数揃い",
      hit: true,
      sets: 1,
      reason: "gstop",
      endGStop: true,
      autoStop: true,
    };
  }
  if (r < 0.242)
    return {
      role: "gstop",
      e: eyes(pick(GS_REACH)),
      pay: 30,
      note: "G-STOP 上乗せ",
      hit: true,
      sets: 1,
      reason: "gstopReach",
      keepGStop: true,
      autoStop: true,
    };
  return { role: "none", e: gstopMissEye(), pay: 0, note: "G-STOP中" };
}
function kind(c) {
  // kindは「役」ではなく液晶出目の分類。左下の役表示はres.role側で小役を表示する。
  if (REACH.includes(c)) return "当選目";
  if (CH.includes(c)) return "チャンス目";
  if (c === "777") return "GOD";
  if (c === "SSS") return "S";
  if (c === "VVV") return "V揃い";
  if (isOddWin(c)) return "奇数揃い";
  return "通常目";
}

function percent(p) {
  return Math.random() < p / 100;
}
function shouldDelay(out) {
  const res = out?.res || {};
  const k = res.child || "";
  // 実機寄せ: GG中は遅れなし。
  if (st.ggRemain > 0 || st.gzone > 0 || st.gstop > 0) return false;

  if (k === "god") return percent(16.41);
  if (["red7", "red7m", "sp"].includes(k) || res.role === "red7") return percent(10.94);
  if (["rf", "rfA", "rfB"].includes(k)) return percent(8);

  // 前兆示唆。前兆中・前兆当選ゲームでは少しだけ出る。
  if (st.pre > 0 || res.hit || res.gstopNow) return percent(3.5);

  // 高モード示唆。低確/通常ではかなり薄く、天国系でだけ現実的に出る。
  const p = {
    lowA: 0.01,
    lowB: 0.03,
    normal: 0.05,
    prepA: 0.35,
    v: 0.45,
    heavenS: 1.1,
    heavenL: 1.6,
    super: 3.2,
  }[st.mode] || 0.02;
  return percent(p);
}
function applyDelayEye(res) {
  if (!res || res.hit || res.direct) return res;

  // 遅れ＋高モード示唆専用出目。通常候補には混ぜない。
  if (st.mode === "super" && percent(35)) {
    res.e = eyes(groupEye("sevenStrong")); // 700 / V7V
    res.note = (res.note || "") + " / 遅れ超天示唆";
    return res;
  }
  if (["heavenS", "heavenL", "super"].includes(st.mode) && percent(35)) {
    res.e = eyes(groupEye("heavenV7")); // V00 / V77
    res.note = (res.note || "") + " / 遅れ天国示唆";
    return res;
  }
  if (["prepA", "v", "heavenS", "heavenL", "super"].includes(st.mode)) {
    res.e = eyes(groupEye(percent(50) ? "delay70" : "delay7Sand")); // 701/703/705 or 727/747/767/787
    res.note = (res.note || "") + " / 遅れ高モード示唆";
  }
  return res;
}
function prepareSpinOutcome() {
  let res,
    pay = 0,
    nm = st.mode,
    branch = "normal";

  if (st.sggRemain > 0 && st.ggRemain > 0) {
    branch = "sgg";
    res = genSGG();
    pay = res.pay || 0;
    nm = res.child ? trans({ k: modeRoleKey(res.child) }) : st.mode;
    return { branch, res, pay, nm };
  }
  if (st.gstop > 0) {
    branch = "gstop";
    res = forceOddWinIfNeeded(genGS(), "gstopOdd");
    pay = res.pay || 0;
    return { branch, res, pay, nm };
  }
  if (st.gzone > 0) {
    branch = "gzone";
    res = forceOddWinIfNeeded(genGZ(), "gzoneOdd");
    pay = res.pay || 0;
    return { branch, res, pay, nm };
  }
  if (st.gstopPre > 0) {
    branch = "gstopPre";
    if (st.ggRemain <= 0) st.tenjoG = (st.tenjoG || 0) + 1;
    res = genGStopPre();
    pay = res.pay || 0;
    return { branch, res, pay, nm };
  }
  if ((st.gstopStockAT || 0) > 0 && st.ggRemain > 0 && st.sggRemain <= 0) {
    startGStopPre("AT中G-STOP前兆", true);
    branch = "gstopPre";
    res = genGStopPre();
    pay = res.pay || 0;
    return { branch, res, pay, nm };
  }
  if (st.ggRemain > 0) {
    branch = "gg";
    res = forceOddWinIfNeeded(genGG(), "ggOdd");
    pay = res.pay || 0;
    nm = res.child ? trans({ k: modeRoleKey(res.child) }) : st.mode;
    return { branch, res, pay, nm };
  }
  if (st.pre > 0) {
    branch = "pre";
    st.tenjoG = (st.tenjoG || 0) + 1;
    res = genPre();
    pay = res.pay || 0;
    return { branch, res, pay, nm };
  }
  if ((st.gstopStock || 0) > 0 && st.ggRemain <= 0 && st.gzone <= 0 && st.gstop <= 0) {
    startGStopPre("G-STOP放出前兆");
    branch = "gstopPre";
    st.tenjoG = (st.tenjoG || 0) + 1;
    res = genGStopPre();
    pay = res.pay || 0;
    return { branch, res, pay, nm };
  }

  st.tenjoG = (st.tenjoG || 0) + 1;
  res = forceOddWinIfNeeded(genNormal(st.tenjoG >= CEILING_G));
  pay = res.pay || 0;
  nm = res.child ? trans({ k: modeRoleKey(res.child) }) : st.mode;
  return { branch, res, pay, nm };
}
function applySpinOutcome(out) {
  let { branch, res } = out,
    pay = out.pay || 0,
    nm = out.nm || st.mode;
  if (res) res.branch = branch;

  if (branch === "sgg") {
    if (res.hit) {
      st.stock += res.sets || 1;
      st.note = res.note;
    }
    if (res.resetSGG) {
      // SGG中はGG残りG数を消費しない。赤7/S揃い時はSGGだけ16Gへ再セット。
      st.sggRemain = 16;
    } else {
      st.sggRemain--;
    }
    if (st.sggRemain <= 0) {
      st.sggRemain = 0;
      st.phase = st.ggRemain > 0 ? "gg" : "normal";
      st.note = res.note + " / SGG終了";
    }
    return finish(res, pay, st.mode);
  }

  if (branch === "gg") {
    if (res.hit) {
      st.stock += res.sets || 1;
      st.note = res.note;
    }
    if (res.startSGG) {
      st.sggRemain = 16;
      st.ggRemain = Math.max(st.ggRemain, 16);
    }
    st.ggRemain--;
    if (st.ggRemain <= 0) {
      st.sggRemain = 0;
      endGG();
    }
    return finish(res, pay, st.mode);
  }

  if (branch === "gstop") {
    const wasInGG = !!st.gstopInGG;

    if (res.hit && (res.endGStop || res.direct)) {
      st.gstop = 0;
      if (wasInGG) {
        st.stock += res.sets || 1;
        if (res.reason === "red7") st.sggRemain = 16;
        resumeGGFromGStop(res.note + " / GG上乗せ");
        nm = st.mode;
      } else {
        startGG(res.sets || 1, res.reason);
        nm = st.mode;
      }
    } else if (res.hit && res.keepGStop) {
      st.stock += res.sets || 1;
      st.gstopHit = true;
      st.note = res.note + " / GG保持";
      st.gstop--;
      if (st.gstop <= 0) {
        if (wasInGG) {
          resumeGGFromGStop("G-STOP終了 / GG再開");
          nm = st.mode;
        } else {
          startGG(1, "gstop");
          nm = st.mode;
        }
      } else {
        nm = st.mode;
      }
    } else {
      st.gstop--;
      if (st.gstop <= 0) {
        if (st.gstopHit) {
          if (wasInGG) {
            resumeGGFromGStop("G-STOP終了 / GG再開");
            nm = st.mode;
          } else {
            startGG(1, "gstop");
            nm = st.mode;
          }
        } else if (wasInGG && (st.gstopStockAT || 0) > 0) {
          resumeGGFromGStop("G-STOP終了 / GG再開");
          startGStopPre("AT中G-STOP再前兆", true);
          nm = st.mode;
        } else if ((st.gstopStock || 0) > 0 && !wasInGG) {
          st.phase = "normal";
          startGStopPre("G-STOP再前兆");
          nm = st.mode;
        } else if (wasInGG) {
          resumeGGFromGStop("G-STOP終了 / GG再開");
          nm = st.mode;
        } else {
          st.mode = "lowA";
          st.phase = "normal";
          st.gstopInGG = false;
          st.note = "G-STOP終了";
          nm = st.mode;
        }
      } else {
        nm = st.mode;
      }
    }
    return finish(res, pay, nm);
  }

  if (branch === "gzone") {
    if (res.hit) {
      startGG(res.sets || 1, res.reason);
      pay += 30;
      nm = st.mode;
    } else {
      st.gzone--;
      if (st.gzone <= 0) {
        st.mode = "lowA";
        st.phase = "normal";
        st.note = "G-ZONE終了";
        nm = st.mode;
        if ((st.gstopStock || 0) > 0) startGStopPre("G-ZONE終了 / G-STOP前兆");
      }
    }
    return finish(res, pay, nm);
  }

  if (branch === "pre") {
    st.pre--;

    if (res.direct) {
      st.pending = false;
      startGG(res.sets || 1, res.reason);
      nm = st.mode;
      return finish(res, pay, nm);
    }

    if (st.pre <= 0 && st.pending) {
      startGG(st.hold || 1, st.holdReason);
      st.pending = false;
      res.hit = true;
      res.autoStop = true;
      nm = st.mode;
    }
    return finish(res, pay, nm);
  }

  if (branch === "gstopPre") {
    st.gstopPre--;

    if (res.direct) {
      startGG(res.sets || 1, res.reason);
      nm = st.mode;
      return finish(res, pay, nm);
    }

    if (res.startGStop) {
      startGStop(res.note);
      nm = st.mode;
    } else {
      nm = st.mode;
    }
    return finish(res, pay, nm);
  }

  if (res.direct) {
    startGG(res.sets || 1, res.reason);
    nm = st.mode;
  } else if (res.hit) {
    startPre(res.sets || 1, res.reason || "mode", res.note);
    pay = 0;
    nm = st.mode;
  } else if (res.gstopNow && (st.gstopStock || 0) > 0) {
    startGStopPre(res.note);
    nm = st.mode;
  }
  return finish(res, pay, nm);
}
function spinPreviewEye() {
  if (st.sggRemain > 0) return nEye();
  if (st.gstop > 0) return gstopMissEye();
  if (st.gstopPre > 0) return Math.random() < 0.35 ? eyes(pick([...EYE_GROUPS.gstopWeak, ...EYE_GROUPS.gstopStrong])) : nEye();
  if (st.gzone > 0) return eyes(pick(GZ));
  return nEye();
}
function shouldShowReelAlert(res) {
  return !!(
    res &&
    (
      res.hit ||
      res.direct ||
      res.startGStop ||
      res.gstopNow ||
      res.keepGStop ||
      res.endGStop
    )
  );
}
function finish(res, pay, nm) {
  let code = res.e.join("");
  st.e = res.e;
  st.reelAlert = shouldShowReelAlert(res);
  st.role = res.role || "none";
  st.mode = safeMode(nm || st.mode);
  st.g++;
  const bet = 3;
  const payout = pay || 0;
  st.coin += payout - bet;
  st.spend += bet;
  st.earn += payout;
  st.coinLog = st.coinLog || [0];
  st.coinLog.push(st.coin);
  const roleLabel = PAY[st.role] ? PAY[st.role][0] : "";
  st.h.unshift({
    g: st.g,
    e: code,
    r: roleLabel,
    k: kind(code),
    p: payout,
  });
  st.h = st.h.slice(0, 30);
  maybeStageChange(false, st.mode);
  if (autoStop(res, code)) autoLeft = 0;
  st.spin = false;
  save();
  render();
  if (autoLeft !== 0) setTimeout(spin, AUTO_NEXT_DELAY);
}
function spin() {
  if (st.spin) return;
  st.reelAlert = false;
  if (autoLeft > 0) autoLeft--;

  const out = prepareSpinOutcome();
  const delayed = shouldDelay(out);
  if (delayed) {
    out.res = applyDelayEye(out.res);
    st.delayed = true;
    st.note = (out.res.note || "") + " / 遅れ";
  } else {
    st.delayed = false;
  }

  st.spin = true;
  render();

  const startDelay = delayed ? 360 : 0;
  const tickMs = delayed ? 72 : 55;
  const maxFrames = delayed ? 14 : 8;

  setTimeout(() => {
    let n = 0,
      t = setInterval(() => {
        st.e = spinPreviewEye();
        render();
        if (++n > maxFrames) {
          clearInterval(t);
          st.delayed = false;
        st.reelAlert = false;
          return applySpinOutcome(out);
        }
      }, tickMs);
  }, startDelay);
}
function reset() {
  autoLeft = 0;
  st = {
    g: 0,
    coin: 0,
    spend: 0,
    earn: 0,
    mode: "lowA",
    phase: "normal",
    e: ["0", "1", "2"],
    role: "none",
    spin: false,
    panel: null,
    h: [],
    mute: true,
    h5: [],
    pre: 0,
    pending: false,
    hold: 0,
    holdReason: "mode",
    gstop: 0,
    gstopStock: 0,
    gstopStockAT: 0,
    gstopPre: 0,
    gstopPreInGG: false,
    gstopHit: false,
    gstopInGG: false,
    tenjoG: 0,
    note: "",
    ggRemain: 0,
    sggRemain: 0,
    stock: 0,
    gzone: 0,
    lastLoop: "-",
    ggStage: "OLYMPUS",
    normalStage: "湖",
    stageGames: 0,
    forceRole: null,
    dummy: false,
    dummyValue: "0",
    delayed: false,
    reelAlert: false,
    coinLog: [0],
  };
  save();
  render();
}
function auto(n) {
  if (st.spin) return;
  autoLeft = n;
  spin();
}
function autoInfinite() {
  if (st.spin) return;
  autoLeft = -1;
  spin();
}
function setDebugMode(mode) {
  st.mode = safeMode(mode);
  st.phase = "normal";
  st.pre = 0;
  st.pending = false;
  st.ggRemain = 0;
  st.sggRemain = 0;
  st.gzone = 0;
  st.gstop = 0;
  st.gstopPre = 0;
  st.gstopHit = false;
  st.gstopInGG = false;
  st.gstopPreInGG = false;
  st.gstopStockAT = 0;
  st.reelAlert = false;
  st.hold = 0;
  st.holdReason = "mode";
  maybeStageChange(true, mode);
  st.note = `DEBUG ${M[mode]?.[0] || mode}`;
}
function handleDebug(act) {
  if (!act) return;
  if (act.startsWith("mode:")) {
    setDebugMode(act.split(":")[1]);
  } else if (act.startsWith("role:")) {
    st.forceRole = act.split(":")[1];
    st.note = "DEBUG 次ゲーム小役指定";
  } else if (act === "gg") {
    startGG(1, "debug");
  } else if (act === "gzone") {
    st.ggRemain = 0;
    st.gstop = 0;
    st.gstopInGG = false;
    st.gstopPreInGG = false;
    st.gzone = 5;
    st.phase = "gzone";
    st.note = "DEBUG G-ZONE";
  } else if (act === "gstop") {
    st.gstopStock = (st.gstopStock || 0) + 1;
    startGStop("DEBUG G-STOP");
  } else if (act === "tenjo") {
    st.ggRemain = 0;
    st.gzone = 0;
    st.gstop = 0;
    st.pre = 0;
    st.pending = false;
    st.mode = "lowA";
    st.phase = "normal";
    st.tenjoG = CEILING_G - 1;
    maybeStageChange(true, st.mode);
    st.note = "DEBUG 天井直前";
  } else if (act === "stage") {
    maybeStageChange(true, st.mode);
    st.note = "DEBUG ステチェン";
  }
  save();
  render();
}

function safe() {
  try {
    localStorage.setItem("__t", "1");
    localStorage.removeItem("__t");
    return true;
  } catch (e) {
    return false;
  }
}
const STORE = safe();
const STORE_KEY = "calc777v160_split_files";
function save() {
  if (STORE) localStorage.setItem(STORE_KEY, JSON.stringify(st));
}
function load() {
  if (STORE) {
    try {
      let x = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (x) {
        st = { ...st, ...x, spin: false, panel: null };
        st.mode = safeMode(st.mode);
        st.gstopStock = st.gstopStock || 0;
        st.gstopStockAT = st.gstopStockAT || 0;
        st.gstopPreInGG = !!st.gstopPreInGG;
        st.gstopHit = !!st.gstopHit;
        st.gstopInGG = !!st.gstopInGG;
        st.tenjoG = st.tenjoG || 0;
        st.normalStage = st.normalStage || "湖";
        st.stageGames = st.stageGames || 0;
        st.forceRole = null;
        st.h5 = (st.h5 || []).map(cleanHistItem).slice(-5);
        st.dummy = !!st.dummy;
        st.dummyValue = st.dummyValue || "0";
        st.delayed = false;
        st.reelAlert = false;
        st.coinLog = st.coinLog && st.coinLog.length ? st.coinLog : [st.coin || 0];
        st.gstopPre = Number(st.gstopPre) || 0;
        st.sggRemain = Number(st.sggRemain) || 0;
      }
    } catch (e) {
      localStorage.removeItem(STORE_KEY);
    }
  }
}
