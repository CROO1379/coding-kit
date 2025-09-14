import { defineConfig } from 'vite';

export default defineConfig({
  // public ディレクトリを静的ファイル用として使用
  publicDir: 'public',

  // 本番ビルド用設定（簡潔化）
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'dist/index.html',
    }
  }
});