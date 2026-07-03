// CALC-777 v16.0
// 確率・役・出目テーブル。
// ここは数値や候補表だけを中心に置き、ゲーム処理は main.js に分離しています。

const SY = "012345678V".split(""),
  SYG = [...SY, "S"];
const M = {
  lowA: ["低確A", "lowA"],
  lowB: ["低確B", "lowB"],
  normal: ["通常", "normal"],
  prepA: ["天準A", "prepA"],
  v: ["V-M", "v"],
  heavenS: ["天短", "heavenS"],
  heavenL: ["天長", "heavenL"],
  super: ["超天", "super"],
  gg: ["GG", "gg"],
  sgg: ["SGG", "gg"],
  gzone: ["G-ZONE", "gzone"],
  gstop: ["G-STOP", "gstop"],
};

const INTERNAL_MODES = new Set(["lowA", "lowB", "normal", "prepA", "v", "heavenS", "heavenL", "super"]);
const PAY = {
  none: ["ハズレ", 0],
  replay: ["青7", 0],
  three: ["3枚役", 3],
  yellow: ["黄7", 8],
  navYellow: ["押順黄7", 15],
  chance: ["1枚役", 1],
  reach: ["", 30],
  ggwin: ["GG", 0],
  gstop: ["G-STOP", 0],
  red7: ["赤7/S", 80],
  god: ["GOD", 120],
  vwin: ["V揃い", 50],
};
const R = [
  ["haz", "ハズレ", 1.5],
  ["oneA", "1枚A", 10.4],
  ["oneB", "1枚B", 102.4],
  ["oneC", "1枚C", 409.6],
  ["ub", "上段青7", 7.9],
  ["mb", "中段青7", 99.9],
  ["ly", "下段黄7", 17.4],
  ["ry", "右上黄7", 57.7],
  ["cry", "共通右上黄7", 655.4],
  ["my", "中段黄7", 936.2],
  ["rf", "赤7フェイク", 327.7],
  ["red7", "赤7", 5461.3],
  ["god", "GOD", 8192],
  ["sp", "特殊SP", 65536],
].map((x) => ({ k: x[0], n: x[1], inv: x[2] }));
const AT_R = [
  // 5号機「神々の凱旋」GG中寄せの簡易小役テーブル。
  // 3枚役と押し順15枚黄7を主軸にして、黄7履歴が出すぎないように調整。
  ["three", "3枚役", 1.8, "three", 3],
  ["py", "押し順15枚黄7", 4.4, "navYellow", 15],
  ["ub", "上段青7", 5.4, "replay", 0],
  ["haz", "ハズレ", 655.4, "none", 0],
  ["oneB", "1枚役", 102.4, "chance", 1],
  ["oneC", "1枚役", 409.6, "chance", 1],
  ["mb", "中段青7", 99.9, "replay", 0],
  ["pry", "押順右上黄7", 57.7, "yellow", 15],
  ["cry", "共通右上黄7", 655.4, "yellow", 15],
  ["my", "中段黄7", 936.2, "yellow", 15],
  ["rfA", "赤7フェイクA", 655.4, "chance", 1],
  ["rfB", "赤7フェイクB", 655.4, "chance", 1],
  ["sp", "特殊SP", 65536, "red7", 80],
  ["red7", "赤7", 6553.6, "red7", 80],
  ["red7m", "中段赤7", 32768, "red7", 80],
  ["god", "GOD", 8192, "god", 120],
].map((x) => ({
  k: x[0],
  n: x[1],
  inv: x[2],
  role: x[3],
  pay: x[4],
}));

const SGG_DIRECT_R = [
  // SGG中の赤7系は分母そのままの直抽選。GODは777、それ以外の当選はSSS。
  ["god", "GOD", 8192, "god", 120],
  ["red7f", "赤7フェイクリプレイ", 10.0, "chance", 1],
  ["red7", "赤7揃い", 29.5, "red7", 80],
  ["red7m", "中段赤7揃い", 206.6, "red7", 80],
].map((x) => ({
  k: x[0],
  n: x[1],
  inv: x[2],
  role: x[3],
  pay: x[4],
}));

const SGG_COMMON_R = [
  // SGG中の非赤7系。通常/AT中と同じ出目法則で表示する。
  ["py", "押し順15枚黄7", 4.4, "navYellow", 15],
  ["three", "3枚役", 1.8, "three", 3],
  ["ub", "上段青7", 21.9, "replay", 0],
  ["oneB", "1枚役", 102.4, "chance", 1],
  ["oneC", "1枚役", 409.6, "chance", 1],
  ["mb", "中段青7", 99.9, "replay", 0],
  ["pry", "押順右上黄7", 57.7, "yellow", 15],
  ["cry", "共通右上黄7", 655.4, "yellow", 15],
  ["my", "中段黄7", 936.2, "yellow", 15],
].map((x) => ({
  k: x[0],
  n: x[1],
  inv: x[2],
  role: x[3],
  pay: x[4],
}));

const SGG_R = [...SGG_DIRECT_R, ...SGG_COMMON_R];
const GG = {
  lowA: 3532.1,
  lowB: 3532.1,
  normal: 751,
  prepA: 3532.1,
  v: 18.2,
  heavenS: 33,
  heavenL: 18.5,
  super: 11,
};
const CEILING_G = 1480;
const SETTING = 1;
const REACH =
    "007 012 026 032 038 046 04V 075 0V0 104 110 123 135 168 175 184 201 223 280 283 2V1 315 324 344 354 365 415 423 428 448 481 4V8 508 510 514 526 543 564 56V 5V0 5V4 634 664 681 728 753 758 78V 801 808 821 841 845 850 873 87V 884 V07 V31 V34".split(
      " ",
    ),
  CH =
    "101 303 505 100 300 500 V0V V2V V4V V6V V8V 38V 468 631 831".split(
      " ",
    ),
  // G-ZONEの通常ハズレ枠。REACHに含まれる 135/315/V31/V34 は通常枠から除外。
  GZ = "113 331 553 V1V V3V V5V".split(" "),
  ALL = new Set([...REACH, ...CH, ...GZ, "777", "SSS", "VVV"]),
  ODD_WIN = new Set(["111", "333", "555"]),
  EYE_GROUPS = {
    basic: "153 124 251 361 436 508 681 845 850 801".split(" "),
    oddOnly: "131 151 315 351 513 531 535 551".split(" "),
    leftEvenKetsu: "211 233 411 433 611 633 811 833".split(" "),
    evenSeq: "234 456 678".split(" "),
    leftOddKetsu: "155 311 355 511 533 711 733 755".split(" "),
    oddSeq: "345 567".split(" "),
    zeroSand: "010 030 050".split(" "),
    oddSand: "131 151 313 353 515 535".split(" "),
    vHint: "V0V V2V V4V V6V V8V 12V 35V 68V 1V5 V46".split(" "),
    vStrong: "V1V V3V V5V".split(" "),
    sevenHint: "177 377 577".split(" "),
    sevenStrong: "700 V7V".split(" "),
    heavenV7: "V00 V77".split(" "),
    delay70: "701 703 705".split(" "),
    delay7Sand: "727 747 767 787".split(" "),
    gstopWeak: "017 01V 022".split(" "),
    gstopStrong: "00V 011 020 0V7".split(" "),
  },
  // G-STOP中は偶数なし。7系/S系は毎ゲーム変わり得るが、Sがある出目には7を混ぜない。
  GS_REACH = "135 175 315 753 V31".split(" "),
  GS_MISS_7 = "131 151 313 353 515 535 V1V V3V V5V V7V 171 373 575".split(" "),
  GS_MISS_S = "1S1 3S3 5S5 S1S S3S S5S 13S 31S 15S 51S 35S 53S VSV SVS 1V3 3V5 5V1".split(" ");
