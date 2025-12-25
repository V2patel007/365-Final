import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const geminiApiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    const geminiPrdModel = env.GEMINI_PRD_MODEL || process.env.GEMINI_PRD_MODEL;
    const geminiStudioModel = env.GEMINI_STUDIO_MODEL || process.env.GEMINI_STUDIO_MODEL;
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(geminiApiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(geminiApiKey),
        'process.env.GEMINI_PRD_MODEL': JSON.stringify(geminiPrdModel),
        'process.env.GEMINI_STUDIO_MODEL': JSON.stringify(geminiStudioModel)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
