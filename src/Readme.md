
制作用スターターキット
==================================================


概要
--------------------------------------------------

Webサイトを制作するための雛形ファイルです。
Prepros の出力設定によって、静的サイト構築とWordPressの静的HTML出力に対応します。




Preprosの設定
--------------------------------------------------

### 静的サイト

HTMLをルートに出力します。

* Pug … Segment: `pug` → Replace With: `../`
* Sass … Segment: `scss` → Replace With: `../assets/css`


### WordPress

HTMLを `/_html/` に出力します。

* Pug … Segment: `pug` → Replace With: `../_html`
* Sass … Segment: `scss` → Replace With: `../assets/css`




CSS
--------------------------------------------------

CSSは、以下の構成を基準とします。

* `/assets/css/global.css` … サイト全域で利用するCSS（必須）
* `/assets/css/fonts.css` … Webフォント用のCSS（Webフォント利用時のみ）
* `/assets/css/page/**.css` … ページ個別のCSS（必須）

fonts.css については、状況に応じてglobalに統合しても問題ありません。




JavaScript
--------------------------------------------------

JavaScriptは、以下の構成を基準とします。

* `/assets/js/main.js` … サイト全域で利用するJavaScript
* `/assets/js/page/**.js` … ページ個別のJavaScript

これらはコンパイル対象ではないため、直接 `/assets/js` にファイルを設置してください。
`_src/js-library/` は、コピー＆ペースト用のコード管理場所です。


