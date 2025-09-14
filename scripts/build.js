import chokidar from 'chokidar';
import pug from 'pug';
import * as sass from 'sass';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { site, pages } from '../src/config/site.js';

// デバウンス用のタイマー（ウォッチモード時のみ使用）
let buildTimer = null;
const DEBOUNCE_DELAY = 50; // 50ms

// エラー情報を保存するグローバル変数
let currentErrors = {
  sass: null,
  js: null,
  pug: null
};

// ディレクトリ作成
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 共通エラー表示用CSS生成
function generateCommonErrorCSS(errorType, errorFile, line, column, cleanMessage, additionalContext = '') {
  // エラータイプに応じた色設定
  const borderColor = '#ce501fff'; // 全て同じ色（Sassと同じ）

  return `
/* ${errorType.toUpperCase()} ERROR */
body::before {
  content: "${errorType.toUpperCase()} ERROR\\A \\A File: ${errorFile}\\A Line: ${line}, Column: ${column}\\A \\A Error: ${cleanMessage}${additionalContext}";
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 99999;
  background: white;
  color: black;
  padding: 20px;
  font-family: 'Courier New', monospace;
  font-size: 16px;
  line-height: 1.2;
  white-space: pre-wrap;
  border-bottom: 3px solid ${borderColor};
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}
`.trim();
}

// Sassエラー表示用CSS生成
function generateErrorCSS(error, filePath) {
  const errorFile = error.span && error.span.url
    ? path.relative(process.cwd(), error.span.url.pathname)
    : filePath;

  const line = error.span && error.span.start ? error.span.start.line + 1 : 'Unknown';
  const column = error.span && error.span.start ? error.span.start.column + 1 : 'Unknown';

  // ANSIカラーコードを除去してエスケープ
  const cleanMessage = error.message
    .replace(/\u001b\[[0-9;]*m/g, '') // ANSIカラーコードを除去
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\A ');

  const cleanContext = error.span && error.span.context
    ? error.span.context
      .replace(/\u001b\[[0-9;]*m/g, '') // ANSIカラーコードを除去
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\A ')
    : '';

  const additionalContext = cleanContext ? '\\A \\A Context:\\A ' + cleanContext : '';

  return generateCommonErrorCSS('SASS COMPILATION', errorFile, line, column, cleanMessage, additionalContext);
}

// JSエラー表示用CSS生成
function generateJSErrorCSS(error, filePath) {
  const errorFile = path.relative(process.cwd(), filePath);
  const line = error.lineNumber || 'Unknown';
  const column = error.columnNumber || 'Unknown';

  // エラーメッセージをクリーンアップ
  const cleanMessage = error.message
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\A ');

  return generateCommonErrorCSS('JAVASCRIPT SYNTAX', errorFile, line, column, cleanMessage);
}

// Pugエラー表示用CSS生成
function generatePugErrorCSS(error, filePath) {
  const errorFile = path.relative(process.cwd(), filePath);
  const line = error.line || 'Unknown';
  const column = error.column || 'Unknown';

  // エラーメッセージをクリーンアップ
  const cleanMessage = error.message
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\A ');

  return generateCommonErrorCSS('PUG COMPILATION', errorFile, line, column, cleanMessage);
}

// HTMLにエラーCSSを埋め込むための関数
function generateErrorStyleTag() {
  let errorStyles = '';

  if (currentErrors.sass) {
    errorStyles += generateErrorCSS(currentErrors.sass.error, currentErrors.sass.filePath);
  } else if (currentErrors.js) {
    errorStyles += generateJSErrorCSS(currentErrors.js.error, currentErrors.js.filePath);
  } else if (currentErrors.pug) {
    errorStyles += generatePugErrorCSS(currentErrors.pug.error, currentErrors.pug.filePath);
  }

  return errorStyles ? `<style>${errorStyles}</style>` : '';
}// 使用されているアセットを分析
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

// オブジェクトを動的にマージするヘルパー関数（pathsをフラット化）
function mergeObjects(target, source, excludeKeys = []) {
  const result = { ...target };

  Object.keys(source).forEach(key => {
    if (!excludeKeys.includes(key)) {
      // pathsオブジェクトの場合はフラット化して個別のプロパティとして追加
      if (key === 'paths' && typeof source[key] === 'object' && source[key] !== null) {
        Object.keys(source[key]).forEach(pathKey => {
          result[pathKey] = source[key][pathKey];
        });
        // pathsオブジェクト自体は追加しない
      } else {
        result[key] = source[key];
      }
    }
  });

  return result;
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

  // 動的にページ設定を生成
  const dynamicPages = generatePageConfig();

  pugFiles.forEach(file => {
    const relativePath = file.replace('src/pug/', '').replace('/index.pug', '').replace('index.pug', '');
    const outputPath = relativePath ? `dist/${relativePath}/index.html` : 'dist/index.html';

    const pageKey = relativePath || 'home';
    const pageConfig = dynamicPages[pageKey];

    try {
      // pageオブジェクトを動的に構築（siteオブジェクト全体をマージ）
      const pageData = mergeObjects({}, site, []); // targetを空オブジェクト、sourceをsiteに
      pageData.slug = pageKey;
      pageData.css_slug = pageKey === 'home' ? 'home' : pageKey;

      // metaオブジェクトも動的に構築
      const metaData = mergeObjects(pageConfig, {}, ['url']); // urlは別途処理

      const html = pug.renderFile(file, {
        site,
        pages: dynamicPages,
        page: pageData,
        meta: {
          ...metaData,
          url: pageConfig.url
        }
      });

      // Pugコンパイル成功時はエラーをクリア
      currentErrors.pug = null;

      // エラースタイルを動的に埋め込み
      let finalHtml = html;
      const errorStyleTag = generateErrorStyleTag();
      if (errorStyleTag) {
        // </head>の直前にエラースタイルを挿入
        finalHtml = html.replace('</head>', `${errorStyleTag}</head>`);
      }

      ensureDir(path.dirname(outputPath));
      fs.writeFileSync(outputPath, finalHtml);
      console.log(`   ✓ ${outputPath}`);
    } catch (error) {
      console.error(`   ✗ Error compiling ${file}:`, error.message);

      // Pugエラーを保存
      currentErrors.pug = { error, filePath: file };

      // エラー表示用のHTMLを生成
      const errorStyleTag = generateErrorStyleTag();
      const errorHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>Pug Compilation Error</title>
  ${errorStyleTag}
</head>
<body>
</body>
</html>`;

      ensureDir(path.dirname(outputPath));
      fs.writeFileSync(outputPath, errorHtml);
    }
  });
}

// SCSSファイルをコンパイル
function buildSCSSFiles(specificFile = null) {
  console.log('🎨 Building SCSS files...');

  ensureDir('dist/assets/css');

  try {
    // SCSS ファイルを動的に検出
    let scssFiles;
    if (specificFile) {
      // 特定ファイルまたは部分ファイルの変更時
      const isPartialFile = path.basename(specificFile).startsWith('_');

      if (isPartialFile) {
        // 部分ファイルが変更された場合、全SCSSファイルを再ビルド
        console.log(`   📝 Partial SCSS file changed: ${specificFile}, rebuilding all SCSS files`);
        scssFiles = glob.sync('src/scss/**/*.scss')
          .filter(file => {
            const filename = path.basename(file);
            return !filename.startsWith('_');
          });
      } else {
        // 通常のSCSSファイルが変更された場合
        scssFiles = [specificFile].filter(file => {
          const filename = path.basename(file);
          return !filename.startsWith('_');
        });
      }
    } else {
      // 全体ビルド時
      scssFiles = glob.sync('src/scss/**/*.scss')
        .filter(file => {
          const filename = path.basename(file);
          return !filename.startsWith('_');
        });
    }

    scssFiles.forEach(file => {
      // src/scss/ からの相対パスを取得
      const relativePath = path.relative('src/scss', file);
      const dirName = path.dirname(relativePath);
      const fileName = path.basename(file, '.scss');

      // 出力パスを動的に生成
      const outputPath = dirName === '.'
        ? `dist/assets/css/${fileName}.css`
        : `dist/assets/css/${dirName}/${fileName}.css`;

      try {
        ensureDir(path.dirname(outputPath));
        const result = sass.compile(file, {
          quietDeps: true,
          verbose: false,
          style: 'expanded',
          silenceDeprecations: ['import']
        });
        fs.writeFileSync(outputPath, result.css);
        console.log(`   ✓ ${outputPath}`);
      } catch (error) {
        // Sassエラーの簡潔な表示
        const errorFile = error.span && error.span.url
          ? path.relative(process.cwd(), error.span.url.pathname)
          : file;
        const line = error.span && error.span.start ? error.span.start.line + 1 : '?';
        const column = error.span && error.span.start ? error.span.start.column + 1 : '?';

        console.error(`   ❌ ${errorFile}:${line}:${column} - ${error.message}`);

        // エラー情報を保存
        currentErrors.sass = { error, filePath: file };

        // ブラウザ用エラー表示CSSを生成
        ensureDir(path.dirname(outputPath));
        const errorCSS = generateErrorCSS(error, file);
        fs.writeFileSync(outputPath, errorCSS);
        console.log(`   ⚠️  ${outputPath} (error display)`);
      }
    });

  } catch (error) {
    console.error(`❌ SCSS Build Error: ${error.message}`);
  }
}

// JSファイルをコピー
function buildJSFiles(specificFile = null) {
  console.log('📦 Building JS files...');

  ensureDir('dist/assets/js');
  ensureDir('dist/assets/css');

  // デフォルトの空のJSエラーファイルを作成
  const errorCSSPath = 'dist/assets/css/js-error.css';
  fs.writeFileSync(errorCSSPath, '/* No JavaScript errors */');

  // 全てのJSファイルを動的に検出
  let jsFiles;
  if (specificFile) {
    // 特定ファイルが指定された場合
    jsFiles = [specificFile];
  } else {
    // 全体ビルド時
    jsFiles = glob.sync('src/js/**/*.js');
  }

  let hasJSError = false;

  jsFiles.forEach(file => {
    // src/js/ からの相対パスを取得
    const relativePath = path.relative('src/js', file);
    const dirName = path.dirname(relativePath);
    const fileName = path.basename(file);

    // 出力パスを決定
    const outputPath = dirName.startsWith('vendor') || dirName === 'vendor'
      ? `dist/assets/js/${relativePath}`
      : dirName === '.'
        ? `dist/assets/js/${fileName}`
        : `dist/assets/js/${dirName}/${fileName}`;

    try {
      ensureDir(path.dirname(outputPath));
      const content = fs.readFileSync(file, 'utf-8');

      // vendor ディレクトリ以外は構文チェック
      if (!dirName.startsWith('vendor') && dirName !== 'vendor') {
        // 基本的なJavaScript構文チェック（Functionコンストラクタを使用）
        try {
          new Function(content);
        } catch (syntaxError) {
          throw syntaxError;
        }
      }

      fs.writeFileSync(outputPath, content);
      console.log(`   ✓ ${outputPath}`);
    } catch (error) {
      // JSエラーの簡潔な表示
      const line = error.lineNumber || '?';
      const column = error.columnNumber || '?';

      console.error(`   ❌ ${file}:${line}:${column} - ${error.message}`);

      // エラー情報を保存
      if (!hasJSError) {
        currentErrors.js = { error, filePath: file };
        const errorCSS = generateJSErrorCSS(error, file);
        fs.writeFileSync(errorCSSPath, errorCSS);
        console.log(`   ⚠️  ${errorCSSPath} (JS error display)`);
        hasJSError = true;
      }
    }
  });
}

// 全体ビルド
function buildAll() {
  console.log('🚀 Building all files...\n');

  // エラー情報をクリア
  currentErrors.sass = null;
  currentErrors.js = null;
  currentErrors.pug = null;

  // 静的ファイルを最初にコピー
  copyStaticFiles();

  buildSCSSFiles();
  buildJSFiles();
  buildPugFiles(); // JSエラー情報を取得した後にPugをビルド

  // アセット使用分析とコピー
  const usedAssets = analyzeAssetUsage();
  copyUsedAssets(usedAssets);

  console.log('\n✅ Full build completed successfully!');
}

// 部分ビルド実行（ウォッチモード時のみ使用）
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
      // Pugエラーをクリア
      currentErrors.pug = null;
      buildPugFiles(filePath);
      // Pugファイル変更時のみアセット再分析（画像参照が変わる可能性）
      const usedAssets = analyzeAssetUsage();
      copyUsedAssets(usedAssets);
    } else if (ext === '.scss') {
      // SCSSエラーをクリア
      currentErrors.sass = null;
      try {
        buildSCSSFiles(filePath);
        // SCSSファイル変更時のみアセット再分析（フォント参照が変わる可能性）
        const usedAssets = analyzeAssetUsage();
        copyUsedAssets(usedAssets);
        // エラーがない場合はPugファイルを再コンパイル（エラー表示を消すため）
        buildPugFiles();
      } catch (scssError) {
        // SCSSエラーは表示するが、ウォッチモードは継続
        console.error('SCSS compilation failed, but watching continues...');
      }
    } else if (ext === '.js') {
      // JSエラーをクリア
      currentErrors.js = null;
      buildJSFiles(filePath);
      // エラーがない場合はPugファイルを再コンパイル（エラー表示を消すため）
      buildPugFiles();
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
    // ウォッチモードでは、エラーが発生してもプロセスを継続
    console.log('🔄 Continuing to watch for file changes...');
  }
}

// デバウンス付きビルド実行（ウォッチモード時のみ使用）
function debouncedBuild(filePath, changeType) {
  if (buildTimer) {
    clearTimeout(buildTimer);
  }

  buildTimer = setTimeout(() => {
    buildSpecific(filePath, changeType);
  }, DEBOUNCE_DELAY);
}

// ウォッチャー開始（ウォッチモード時のみ使用）
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

// コマンドライン引数の処理
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node scripts/build.js [options]

Options:
  --watch, -w    Start file watcher for development
  --help, -h     Show this help message

Without --watch: Builds all files once and exits.
With --watch: Starts file watcher and rebuilds on changes.
`);
  process.exit(0);
}

const isWatchMode = args.includes('--watch') || args.includes('-w');

if (isWatchMode) {
  // ウォッチモード
  console.log('🚀 Starting in watch mode...\n');
  console.log('👀 File watcher ready - waiting for changes...\n');
  startWatcher();
} else {
  // ビルドモード
  console.log('🚀 Starting build...\n');
  buildAll();
}