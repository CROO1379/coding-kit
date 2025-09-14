import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

export default defineConfig({
  // public ディレクトリをカスタム使用するため無効化
  publicDir: false,

  // 本番ビルド用設定
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'public/index.html',
    },

    // ビルド後にpublicディレクトリをdistにコピー（フラットに）
    plugins: [
      {
        name: 'copy-public-to-dist',
        writeBundle() {
          // publicディレクトリの全ファイルをdistにコピー
          const publicFiles = glob.sync('public/**/*', { nodir: true });

          publicFiles.forEach(file => {
            // public/ プレフィックスを除去してdistに直接配置
            const relativePath = file.replace('public/', '');
            const destPath = path.join('dist', relativePath);
            const destDir = path.dirname(destPath);

            // ディレクトリが存在しない場合は作成
            mkdirSync(destDir, { recursive: true });

            // ファイルをコピー
            copyFileSync(file, destPath);
          });

          console.log('✓ Copied public directory to dist');
        }
      }
    ]
  }
});