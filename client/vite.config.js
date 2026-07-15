import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        react()
    ],
    base: './',
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: process.env.VITE_DEV_PROXY_TARGET || 'http://127.0.0.1:3001',
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: 'build'
    },
});
