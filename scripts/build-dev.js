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

  // Pugファイルから画像パスを抽出
  const pugFiles = glob.sync('src/pug/**/*.pug');
  pugFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');

    // img要素のsrc属性を抽出（絶対パス形式）
    const imgMatches = content.match(/src=["']\/assets\/img\/([^"']+)["']/g);
    if (imgMatches) {
      imgMatches.forEach(match => {
        const pathMatch = match.match(/\/assets\/img\/([^"']+)/);
        if (pathMatch) {
          usedAssets.add(`img/${pathMatch[1]}`);
        }
      });
    }

    // srcset属性からも抽出
    const srcsetMatches = content.match(/srcset=["']\/assets\/img\/([^"']+)["']/g);
    if (srcsetMatches) {
      srcsetMatches.forEach(match => {
        const pathMatch = match.match(/\/assets\/img\/([^"']+)/);
        if (pathMatch) {
          usedAssets.add(`img/${pathMatch[1]}`);
        }
      });
    }
  });

  // CSSファイルからフォントと画像パスを抽出
  const scssFiles = glob.sync('src/scss/**/*.scss');
  scssFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');

    // font-faceのurl()を抽出
    const fontMatches = content.match(/url\(['"]?[^)]*fonts\/[^)'"]*/g);
    if (fontMatches) {
      fontMatches.forEach(match => {
        const fontPath = match.match(/fonts\/([^)'"]*)/)
        if (fontPath) {
          usedAssets.add(`fonts/${fontPath[1]}`);
        }
      });
    }

    // background-imageなどの画像を抽出
    const bgMatches = content.match(/url\(['"]?[^)]*img\/[^)'"]*/g);
    if (bgMatches) {
      bgMatches.forEach(match => {
        const imgPath = match.match(/img\/([^)'"]*)/)
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
  ensureDir('public/assets/img');
  ensureDir('public/assets/fonts');

  let copiedCount = 0;
  let missingCount = 0;

  usedAssets.forEach(assetPath => {
    const srcPath = `src/${assetPath}`;
    const destPath = `public/assets/${assetPath}`;

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

// 1. Pugファイルをコンパイル
function buildPugFiles() {
  console.log('🔨 Building Pug files...');

  const pugFiles = glob.sync('src/pug/**/index.pug', {
    ignore: ['src/pug/_*/**']
  });

  pugFiles.forEach(file => {
    const relativePath = file.replace('src/pug/', '').replace('/index.pug', '').replace('index.pug', '');
    const outputPath = relativePath ? `public/${relativePath}/index.html` : 'public/index.html';

    const pageKey = relativePath || 'home';
    const pageConfig = pages[pageKey] || pages.home;

    try {
      const html = pug.renderFile(file, {
        site,
        pages,
        page: {
          slug: pageKey,
          css_slug: pageKey === 'home' ? 'home' : pageKey,
          root: '/',
          css: '/assets/css/',
          js: '/assets/js/',
          img: '/assets/img/',
          pdf: '/assets/pdf/',
          video: '/assets/video/'
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

  ensureDir('public/assets/css');
  ensureDir('public/assets/css/page');

  try {
    // global.scss
    const globalResult = sass.compile('src/scss/global.scss');
    fs.writeFileSync('public/assets/css/global.css', globalResult.css);
    console.log('   ✓ public/assets/css/global.css');

    // ページ固有のSCSS
    const pageFiles = glob.sync('src/scss/page/*.scss');
    pageFiles.forEach(file => {
      try {
        const name = path.basename(file, '.scss');
        const result = sass.compile(file);
        fs.writeFileSync(`public/assets/css/page/${name}.css`, result.css);
        console.log(`   ✓ public/assets/css/page/${name}.css`);
      } catch (error) {
        console.error(`   ✗ Error compiling ${file}:`, error.message);
      }
    });
  } catch (error) {
    console.error('Error compiling SCSS:', error.message);
  }
}

// 3. JSファイルをコピー
function buildJSFiles() {
  console.log('📦 Building JS files...');

  ensureDir('public/assets/js');
  ensureDir('public/assets/js/page');

  // main.js
  if (fs.existsSync('src/js/main.js')) {
    const mainJS = fs.readFileSync('src/js/main.js', 'utf-8');
    fs.writeFileSync('public/assets/js/main.js', mainJS);
    console.log('   ✓ public/assets/js/main.js');
  }

  // ページ固有のJS
  const pageFiles = glob.sync('src/js/page/*.js');
  pageFiles.forEach(file => {
    const name = path.basename(file);
    const content = fs.readFileSync(file, 'utf-8');
    fs.writeFileSync(`public/assets/js/page/${name}`, content);
    console.log(`   ✓ public/assets/js/page/${name}`);
  });

  // vendor JS（もしあれば）
  const vendorFiles = glob.sync('src/js/vendor/*.js');
  if (vendorFiles.length > 0) {
    ensureDir('public/assets/js/vendor');
    vendorFiles.forEach(file => {
      const name = path.basename(file);
      const content = fs.readFileSync(file, 'utf-8');
      fs.writeFileSync(`public/assets/js/vendor/${name}`, content);
      console.log(`   ✓ public/assets/js/vendor/${name}`);
    });
  }
}

// メイン実行関数
function buildAll() {
  console.log('🚀 Building for development preview...\n');

  // ビルド実行
  buildPugFiles();
  buildSCSSFiles();
  buildJSFiles();

  // アセット使用分析とコピー
  const usedAssets = analyzeAssetUsage();
  copyUsedAssets(usedAssets);

  console.log('\n✅ Development build complete!');
  console.log('📁 Files are ready in public/ directory');
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