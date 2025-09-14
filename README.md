
# Static Site Starter Kit

Vite + Pug + Sass + Vanilla JS を使用したモダンな静的サイト制作のためのスターターキットです。

## 特徴

- **Vite** による高速な開発サーバーとビルド
- **Pug** テンプレートエンジンによるコンポーネント化された HTML
- **Sass/SCSS** によるモジュラーな CSS 設計
- **Vanilla JavaScript** によるライブラリに依存しない実装
- **アセット最適化** - 使用されているフォント・画像のみを自動検出・コピー
- **開発プレビュー** - public ディレクトリでの即座な確認
- **本番ビルド** - dist ディレクトリへの最適化された出力

## 必要環境

- Node.js 18.x 以上
- npm または yarn

## セットアップ

```bash
# 依存関係のインストール
npm install

# 開発環境の起動
npm run dev
```

## 利用可能なコマンド

```bash
# 開発用ビルド（public/ ディレクトリに出力）
npm run build:dev

# 開発プレビューサーバー起動
npm run dev:serve

# 開発環境（ビルド + プレビューサーバー起動）
npm run dev

# 本番用ビルド（dist/ ディレクトリに出力）
npm run build

# 本番プレビューサーバー起動
npm run preview
```

## プロジェクト構造

```
src/
├── config/
│   └── site.js              # サイト設定（Pugテンプレート用変数）
├── fonts/                   # Webフォントファイル
│   ├── static/              # スタティックフォント
│   └── variable/            # バリアブルフォント
├── img/                     # 画像ファイル
├── js/
│   ├── main.js              # グローバル JavaScript
│   └── page/                # ページ固有の JavaScript
├── pug/
│   ├── index.pug            # トップページ
│   ├── subpage/
│   │   └── index.pug        # サブページ
│   ├── _inc/                # インクルード用部品
│   ├── _mixin/              # Pug ミックスイン
│   └── _parts/              # 再利用可能なコンポーネント
└── scss/
    ├── global.scss          # グローバル CSS
    ├── _core/               # コア設定（変数、ミックスイン等）
    ├── _global/             # グローバルスタイル
    ├── _parts/              # コンポーネントスタイル
    ├── _vendor/             # サードパーティ CSS
    └── page/                # ページ固有のスタイル
```

## 開発ワークフロー

### 1. 開発環境の起動

```bash
npm run dev
```

このコマンドは以下を実行します：
1. `src/` の内容を `public/` にビルド
2. `http://localhost:3000` でプレビューサーバーを起動

### 2. ファイルの編集

- **Pug**: `src/pug/` 内でテンプレートを編集
- **Sass**: `src/scss/` 内でスタイルを編集
- **JavaScript**: `src/js/` 内でスクリプトを編集
- **アセット**: `src/img/` や `src/fonts/` に画像・フォントを配置

### 3. 自動ビルド

ファイル変更後は手動でビルドコマンドを実行：

```bash
npm run build:dev
```

## ページの追加方法

### 1. Pug テンプレートの作成

```bash
src/pug/新しいページ名/index.pug
```

### 2. ページ固有の CSS（必要に応じて）

```bash
src/scss/page/新しいページ名.scss
```

### 3. ページ固有の JavaScript（必要に応じて）

```bash
src/js/page/新しいページ名.js
```

### 4. サイト設定の更新

`src/config/site.js` にページ情報を追加：

```javascript
const pages = {
  home: { /* ... */ },
  新しいページ名: {
    title: 'ページタイトル',
    description: 'ページ説明',
    // その他の設定...
  }
};
```

## アセット管理

### フォント

- `src/scss/_global/base/_fonts.scss` でフォントを有効化
- 実際に使用されているフォントのみが出力ディレクトリにコピーされます

### 画像

- Pug テンプレート内で絶対パス（`/assets/img/...`）で参照
- 使用されている画像のみが自動的にコピーされます

## JavaScript機能

### メイン機能（main.js）

- **スムーススクロール**: アンカーリンクの滑らかなスクロール
- **ドロワーメニュー**: レスポンシブ対応のサイドメニュー
- **小サイズスクリーン対応**: 360px以下での画面調整

### ページ固有機能

- **アコーディオン**: `details` 要素を使用した開閉コンポーネント（subpage.js）

## CSS設計

### 設計思想

- **FLOCSS** ベースのファイル構成
- **BEM** 記法による命名規則
- **モバイルファースト** のレスポンシブデザイン

### 主要な設定ファイル

- `_core/_theme_color.scss`: カラーパレット
- `_core/_responsive.scss`: ブレークポイント設定
- `_core/_mixin-object.scss`: 共通ミックスイン

## 本番ビルド

```bash
npm run build
```

本番用ビルドでは：
- CSS/JS の最小化
- アセットの最適化
- `dist/` ディレクトリへの出力

## トラブルシューティング

### ビルドエラーが発生する場合

1. `node_modules` を削除して再インストール：
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. キャッシュのクリア：
   ```bash
   npx vite clean
   ```

### アセットが正しく読み込まれない場合

1. パスが絶対パス（`/assets/...`）になっているか確認
2. `npm run build:dev` を実行してビルドを更新

### プレビューサーバーが起動しない場合

1. ポート3000が使用されていないか確認
2. 別のポートを指定：
   ```bash
   npx vite preview --port 3001 --outDir public
   ```

## ライセンス

MIT License

## 更新履歴

- **v1.0.0**: 初期リリース
  - Vite + Pug + Sass + Vanilla JS の統合
  - アセット最適化システム
  - 開発・本番ビルド環境



