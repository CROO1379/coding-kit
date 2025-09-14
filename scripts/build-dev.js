import pug from 'pug';
import * as sass from 'sass';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { site, pages } from '../src/config/site.js';

// ディレクトリ作成
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 使用されているアセットを分析
function analyzeAssetUsage() {
  const usedAssets = new Set();

  console.log('🔍 Analyzing asset usage...');

  // コンパイル済みHTMLファイルから画像パスを抽出
  const htmlFiles = glob.sync('dist/**/*.html');
  htmlFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');

    // 相対パス形式の画像を抽出（./img/ または ../img/）
    const relativeImgMatches = content.match(/src=["']\.\/?\.?\/img\/([^"']+)["']/g);
    if (relativeImgMatches) {
      relativeImgMatches.forEach(match => {
        const pathMatch = match.match(/img\/([^"']+)/);
        if (pathMatch) {
          usedAssets.add(`img/${pathMatch[1]}`);
        }
      });
    }

    // 絶対パス形式の画像も抽出
    const absoluteImgMatches = content.match(/src=["']\/assets\/img\/([^"']+)["']/g);
    if (absoluteImgMatches) {
      absoluteImgMatches.forEach(match => {
        const pathMatch = match.match(/\/assets\/img\/([^"']+)/);
        if (pathMatch) {
          usedAssets.add(`img/${pathMatch[1]}`);
        }
      });
    }

    // srcset属性からも抽出
    const srcsetMatches = content.match(/srcset=["'][^"']*\/assets\/img\/([^"']+)["']/g);
    if (srcsetMatches) {
      srcsetMatches.forEach(match => {
        const pathMatch = match.match(/\/assets\/img\/([^"']+)/);
        if (pathMatch) {
          usedAssets.add(`img/${pathMatch[1]}`);
        }
      });
    }

    // source要素からも抽出
    const sourceMatches = content.match(/<source[^>]+srcset=["'][^"']*\/assets\/img\/([^"']+)["'][^>]*>/g);
    if (sourceMatches) {
      sourceMatches.forEach(match => {
        const pathMatch = match.match(/\/assets\/img\/([^"']+)/);
        if (pathMatch) {
          usedAssets.add(`img/${pathMatch[1]}`);
        }
      });
    }
  });

  // コンパイル済みCSSファイルからフォントと画像パスを抽出
  const cssFiles = glob.sync('dist/assets/css/**/*.css');
  cssFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');

    // font-faceのurl()を抽出（相対パス "../fonts/" 形式）
    const fontMatches = content.match(/url\(["']?\.\.\/fonts\/[^)'"]+/g);
    if (fontMatches) {
      fontMatches.forEach(match => {
        const fontPath = match.match(/\.\.\/fonts\/([^)'"]+)/);
        if (fontPath) {
          usedAssets.add(`fonts/${fontPath[1]}`);
        }
      });
    }

    // background-imageなどの画像を抽出
    const bgMatches = content.match(/url\(["']?\.\.\/img\/[^)'"]+/g);
    if (bgMatches) {
      bgMatches.forEach(match => {
        const imgPath = match.match(/\.\.\/img\/([^)'"]+)/);
        if (imgPath) {
          usedAssets.add(`img/${imgPath[1]}`);
        }
      });
    }
  });

  console.log(`📋 Found ${usedAssets.size} used assets:`);
  Array.from(usedAssets).sort().forEach(asset => {
    console.log(`   - ${asset}`);
  });

  return usedAssets;
}

// 使用されているアセットのみコピー
function copyUsedAssets(usedAssets) {
  ensureDir('dist/assets/img');
  ensureDir('dist/assets/fonts');

  let copiedCount = 0;
  let missingCount = 0;

  usedAssets.forEach(assetPath => {
    const srcPath = `src/${assetPath}`;
    const destPath = `dist/assets/${assetPath}`;

    if (fs.existsSync(srcPath)) {
      ensureDir(path.dirname(destPath));
      fs.copyFileSync(srcPath, destPath);
      copiedCount++;
    } else {
      console.warn(`⚠️  Asset not found: ${srcPath}`);
      missingCount++;
    }
  });

  console.log(`✓ Copied ${copiedCount} used assets`);
  if (missingCount > 0) {
    console.log(`⚠️  ${missingCount} assets were referenced but not found`);
  }
}

// 静的ファイルをコピー
function copyStaticFiles() {
  console.log('📋 Copying static files...');

  if (fs.existsSync('public')) {
    const staticFiles = glob.sync('public/**/*', { nodir: true });

    if (staticFiles.length > 0) {
      staticFiles.forEach(file => {
        const relativePath = file.replace('public/', '');
        const destPath = `dist/${relativePath}`;

        ensureDir(path.dirname(destPath));
        fs.copyFileSync(file, destPath);
      });

      console.log(`   ✓ Copied ${staticFiles.length} static files from public/`);
    } else {
      console.log('   - No static files found in public/');
    }
  } else {
    console.log('   - public/ directory not found');
  }
}

// 動的にページ設定を生成
function generatePageConfig() {
  const pugFiles = glob.sync('src/pug/**/index.pug', {
    ignore: ['src/pug/_*/**']
  });

  const dynamicPages = {};

  pugFiles.forEach(file => {
    const relativePath = file.replace('src/pug/', '').replace('/index.pug', '').replace('index.pug', '');
    const pageKey = relativePath || 'home';

    // 既存のpages設定があればそれを使用、なければデフォルト値を生成
    if (pages[pageKey]) {
      dynamicPages[pageKey] = pages[pageKey];
    } else {
      // 新しいページのデフォルト設定を生成
      const pageTitle = pageKey === 'home' ? 'ホーム' : pageKey.charAt(0).toUpperCase() + pageKey.slice(1);
      dynamicPages[pageKey] = {
        title: `${pageTitle} - ${site.name}`,
        description: `${pageTitle}ページの説明`,
        url: site.url + (pageKey === 'home' ? '' : pageKey)
      };
    }
  });

  return dynamicPages;
}

// 1. Pugファイルをコンパイル
function buildPugFiles() {
  console.log('🔨 Building Pug files...');

  const pugFiles = glob.sync('src/pug/**/index.pug', {
    ignore: ['src/pug/_*/**']
  });

  // 動的にページ設定を生成
  const dynamicPages = generatePageConfig();

  pugFiles.forEach(file => {
    const relativePath = file.replace('src/pug/', '').replace('/index.pug', '').replace('index.pug', '');
    const outputPath = relativePath ? `dist/${relativePath}/index.html` : 'dist/index.html';

    const pageKey = relativePath || 'home';
    const pageConfig = dynamicPages[pageKey];

    try {
      const html = pug.renderFile(file, {
        site,
        pages: dynamicPages,
        page: {
          slug: pageKey,
          css_slug: pageKey === 'home' ? 'home' : pageKey,
          root: site.paths.root,
          css: site.paths.css,
          js: site.paths.js,
          img: site.paths.img,
          pdf: site.paths.pdf,
          video: site.paths.video
        },
        meta: {
          title: pageConfig.title,
          description: pageConfig.description,
          url: pageConfig.url
        }
      });

      ensureDir(path.dirname(outputPath));
      fs.writeFileSync(outputPath, html);
      console.log(`   ✓ ${outputPath}`);
    } catch (error) {
      console.error(`   ✗ Error compiling ${file}:`, error.message);
    }
  });
}

// 2. SCSSファイルをコンパイル
function buildSCSSFiles() {
  console.log('🎨 Building SCSS files...');

  ensureDir('dist/assets/css');

  // 全てのSCSSファイルを動的に検出（パーシャルファイル以外）
  const scssFiles = glob.sync('src/scss/**/*.scss')
    .filter(file => {
      const filename = path.basename(file);
      // _で始まるファイル（パーシャル）は除外
      return !filename.startsWith('_');
    });

  scssFiles.forEach(file => {
    // src/scss/ からの相対パスを取得
    const relativePath = path.relative('src/scss', file);
    const dirName = path.dirname(relativePath);
    const baseName = path.basename(file, '.scss');

    // 出力パスを動的に生成
    const outputPath = dirName === '.'
      ? `dist/assets/css/${baseName}.css`
      : `dist/assets/css/${dirName}/${baseName}.css`;

    ensureDir(path.dirname(outputPath));

    try {
      const result = sass.renderSync({
        file: file,
        outputStyle: 'compressed',
        sourceMap: true,
        outFile: outputPath
      });

      fs.writeFileSync(outputPath, result.css);
      console.log(`   ✓ ${outputPath}`);
    } catch (error) {
      console.error(`❌ Error compiling ${file}:`, error.message);
    }
  });
}

// 3. JSファイルをコピー
function buildJSFiles() {
  console.log('📦 Building JS files...');

  ensureDir('dist/assets/js');

  // 全てのJSファイルを動的に検出
  const jsFiles = glob.sync('src/js/**/*.js');

  jsFiles.forEach(file => {
    // src/js/ からの相対パスを取得
    const relativePath = path.relative('src/js', file);
    const dirName = path.dirname(relativePath);
    const fileName = path.basename(file);

    // vendor ディレクトリの場合は特別扱い
    if (dirName.startsWith('vendor')) {
      const outputPath = `dist/assets/js/${relativePath}`;
      ensureDir(path.dirname(outputPath));
      const content = fs.readFileSync(file, 'utf-8');
      fs.writeFileSync(outputPath, content);
      console.log(`   ✓ ${outputPath}`);
    } else {
      // 通常のJSファイル
      const outputPath = dirName === '.'
        ? `dist/assets/js/${fileName}`
        : `dist/assets/js/${dirName}/${fileName}`;

      ensureDir(path.dirname(outputPath));
      const content = fs.readFileSync(file, 'utf-8');
      fs.writeFileSync(outputPath, content);
      console.log(`   ✓ ${outputPath}`);
    }
  });
}

// メイン実行関数
function buildAll() {
  console.log('🚀 Building for development preview...\n');

  // 静的ファイルを最初にコピー
  copyStaticFiles();

  // ビルド実行
  buildPugFiles();
  buildSCSSFiles();
  buildJSFiles();

  // アセット使用分析とコピー
  const usedAssets = analyzeAssetUsage();
  copyUsedAssets(usedAssets);

  console.log('\n✅ Development build complete!');
  console.log('📁 Files are ready in dist/ directory');
  console.log('🌐 Run "npm run dev:serve" to start preview server');
}

// コマンドライン引数の処理
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(`
Usage: node scripts/build-dev.js [options]

Options:
  --help          Show this help message
  
This script builds Pug templates, compiles SCSS, and copies only used assets to public/ directory.
`);
  process.exit(0);
}

buildAll();