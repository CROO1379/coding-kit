import chokidar from 'chokidar';
import pug from 'pug';
import * as sass from 'sass';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { site, pages } from '../src/config/site.js';

// デバウンス用のタイマー
let buildTimer = null;
const DEBOUNCE_DELAY = 50; // 50ms (さらに短縮)

// ディレクトリ作成
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 使用されているアセットを分析
function analyzeAssetUsage() {
  const startTime = performance.now();
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

  const endTime = performance.now();
  console.log(`📊 Asset analysis completed in ${(endTime - startTime).toFixed(2)}ms`);

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

// Pugファイルをコンパイル
function buildPugFiles(specificFile = null) {
  console.log('🔨 Building Pug files...');

  // パーシャルファイル（_で始まる）が変更された場合は全体を再コンパイル
  const isPartialFile = specificFile && (specificFile.includes('/_') || specificFile.includes('\\_'));

  const pugFiles = (specificFile && !isPartialFile)
    ? [specificFile].filter(file => file.includes('index.pug') && !file.includes('/_') && !file.includes('\\_'))
    : glob.sync('src/pug/**/index.pug', { ignore: ['src/pug/_*/**'] });

  if (isPartialFile) {
    console.log(`   📝 Partial file changed: ${specificFile} - recompiling all pages`);
  }

  pugFiles.forEach(file => {
    const relativePath = file.replace('src/pug/', '').replace('/index.pug', '').replace('index.pug', '');
    const outputPath = relativePath ? `dist/${relativePath}/index.html` : 'dist/index.html';

    const pageKey = relativePath || 'home';
    const pageConfig = pages[pageKey] || pages.home;

    try {
      const html = pug.renderFile(file, {
        site,
        pages,
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

// SCSSファイルをコンパイル
function buildSCSSFiles(specificFile = null) {
  console.log('🎨 Building SCSS files...');

  ensureDir('dist/assets/css');
  ensureDir('dist/assets/css/page');

  try {
    if (!specificFile || specificFile.includes('global.scss')) {
      // global.scss
      const globalResult = sass.compile('src/scss/global.scss');
      fs.writeFileSync('dist/assets/css/global.css', globalResult.css);
      console.log('   ✓ dist/assets/css/global.css');
    }

    // ページ固有のSCSS
    const pageFiles = specificFile
      ? [specificFile].filter(file => file.includes('src/scss/page/'))
      : glob.sync('src/scss/page/*.scss');

    pageFiles.forEach(file => {
      try {
        const name = path.basename(file, '.scss');
        const result = sass.compile(file);
        fs.writeFileSync(`dist/assets/css/page/${name}.css`, result.css);
        console.log(`   ✓ dist/assets/css/page/${name}.css`);
      } catch (error) {
        console.error(`   ✗ Error compiling ${file}:`, error.message);
      }
    });

    // global.scssの依存ファイルが変更された場合は全体を再コンパイル
    if (specificFile && !specificFile.includes('page/') && !specificFile.includes('global.scss')) {
      const globalResult = sass.compile('src/scss/global.scss');
      fs.writeFileSync('dist/assets/css/global.css', globalResult.css);
      console.log('   ✓ dist/assets/css/global.css (dependency updated)');
    }
  } catch (error) {
    console.error('Error compiling SCSS:', error.message);
  }
}

// JSファイルをコピー
function buildJSFiles(specificFile = null) {
  console.log('📦 Building JS files...');

  ensureDir('dist/assets/js');
  ensureDir('dist/assets/js/page');

  if (!specificFile || specificFile.includes('main.js')) {
    // main.js
    if (fs.existsSync('src/js/main.js')) {
      const mainJS = fs.readFileSync('src/js/main.js', 'utf-8');
      fs.writeFileSync('dist/assets/js/main.js', mainJS);
      console.log('   ✓ dist/assets/js/main.js');
    }
  }

  // ページ固有のJS
  const pageFiles = specificFile
    ? [specificFile].filter(file => file.includes('src/js/page/'))
    : glob.sync('src/js/page/*.js');

  pageFiles.forEach(file => {
    const name = path.basename(file);
    const content = fs.readFileSync(file, 'utf-8');
    fs.writeFileSync(`dist/assets/js/page/${name}`, content);
    console.log(`   ✓ dist/assets/js/page/${name}`);
  });

  // vendor JS
  const vendorFiles = specificFile
    ? [specificFile].filter(file => file.includes('src/js/vendor/'))
    : glob.sync('src/js/vendor/*.js');

  if (vendorFiles.length > 0) {
    ensureDir('dist/assets/js/vendor');
    vendorFiles.forEach(file => {
      const name = path.basename(file);
      const content = fs.readFileSync(file, 'utf-8');
      fs.writeFileSync(`dist/assets/js/vendor/${name}`, content);
      console.log(`   ✓ dist/assets/js/vendor/${name}`);
    });
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

// 部分ビルド実行
function buildSpecific(filePath, changeType = 'change') {
  const buildStartTime = performance.now();
  console.log(`\n🔄 File ${changeType}: ${filePath}`);

  const ext = path.extname(filePath);
  const isAssetFile = filePath.includes('src/img/') || filePath.includes('src/fonts/');

  try {
    if (filePath.includes('src/config/site.js')) {
      console.log('📝 Config file changed - rebuilding all...');
      buildAll();
    } else if (ext === '.pug') {
      buildPugFiles(filePath);
      // Pugファイル変更時のみアセット再分析（画像参照が変わる可能性）
      const usedAssets = analyzeAssetUsage();
      copyUsedAssets(usedAssets);
    } else if (ext === '.scss') {
      buildSCSSFiles(filePath);
      // SCSSファイル変更時のみアセット再分析（フォント参照が変わる可能性）
      const usedAssets = analyzeAssetUsage();
      copyUsedAssets(usedAssets);
    } else if (ext === '.js') {
      buildJSFiles(filePath);
      // JSファイルはアセット分析不要
    } else if (isAssetFile) {
      // アセットファイルの変更時は使用分析を再実行
      const usedAssets = analyzeAssetUsage();
      copyUsedAssets(usedAssets);
    }

    const buildEndTime = performance.now();
    console.log(`⏱️  Total build time: ${(buildEndTime - buildStartTime).toFixed(2)}ms`);
    console.log('✅ Build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
  }
}

// 全体ビルド
function buildAll() {
  console.log('🚀 Building all files...\n');

  // 静的ファイルを最初にコピー
  copyStaticFiles();

  buildPugFiles();
  buildSCSSFiles();
  buildJSFiles();

  // アセット使用分析とコピー
  const usedAssets = analyzeAssetUsage();
  copyUsedAssets(usedAssets);

  console.log('\n✅ Full build completed successfully!');
}

// デバウンス付きビルド実行
function debouncedBuild(filePath, changeType) {
  if (buildTimer) {
    clearTimeout(buildTimer);
  }

  buildTimer = setTimeout(() => {
    buildSpecific(filePath, changeType);
  }, DEBOUNCE_DELAY);
}

// ウォッチャー開始
function startWatcher() {
  console.log('👀 Starting file watcher...');
  console.log('🎯 Watching: src/ directory');
  console.log('⏱️  Debounce delay: 50ms');
  console.log('🛑 Press Ctrl+C to stop\n');

  // ファイルウォッチャーの設定
  const watcher = chokidar.watch('src/', {
    ignored: [
      '**/node_modules/**',
      '**/.git/**',
      '**/.*' // 隠しファイルを無視
    ],
    persistent: true,
    ignoreInitial: true
  });

  watcher
    .on('change', (filePath) => {
      debouncedBuild(filePath, 'changed');
    })
    .on('add', (filePath) => {
      debouncedBuild(filePath, 'added');
    })
    .on('unlink', (filePath) => {
      console.log(`\n🗑️  File deleted: ${filePath}`);
      // ファイル削除時は全体を再ビルド（安全のため）
      setTimeout(() => {
        buildAll();
      }, DEBOUNCE_DELAY);
    })
    .on('error', (error) => {
      console.error('❌ Watcher error:', error);
    });

  // プロセス終了時の処理
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping file watcher...');
    watcher.close();
    process.exit(0);
  });
}

// メイン実行
startWatcher();