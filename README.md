# CALC-777 v16.0 split files

単一HTML版 v15.5 を、編集しやすいように分割した版です。

## ファイル構成

- `index.html`
  - 画面のHTML骨格
  - CSS/JSを読み込むだけの入口

- `css/style.css`
  - UIの見た目
  - 液晶、リール、DATAタブ、スランプグラフ、ボタンなど

- `js/tables.js`
  - 確率テーブル
  - 小役テーブル
  - SGG/GG中テーブル
  - 液晶出目候補
  - モード別当選率など

- `js/main.js`
  - メインプログラム
  - 状態管理
  - 抽選処理
  - GG / SGG / G-ZONE / G-STOP の進行
  - AUTO停止判定
  - セーブ/ロード

- `js/ui.js`
  - 画面描画
  - DATA / MODE / 履歴 / DEBUG パネル
  - ボタン入力
  - 液晶タップ停止
  - スランプグラフ描画

## 起動方法

`index.html` をブラウザで開いてください。

## 今後の編集目安

- 確率を直したい → `js/tables.js`
- 挙動を直したい → `js/main.js`
- 画面やボタンを直したい → `js/ui.js`
- 色・サイズ・余白を直したい → `css/style.css`
