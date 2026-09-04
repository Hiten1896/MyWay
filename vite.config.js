import { defineConfig } from 'vite';

export default defineConfig({
    root: '.',
    envDir: '.',
    build: {
        outDir: 'dist',
        emptyOutDir: true
    }
});
