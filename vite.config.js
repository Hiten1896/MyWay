import { defineConfig } from 'vite';

export default defineConfig({
    root: 'frontend',
    envDir: '..',
    build: {
        outDir: 'dist',
        emptyOutDir: true
    }
});
