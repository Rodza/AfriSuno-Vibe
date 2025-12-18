
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // Fix: Use '.' instead of process.cwd() to resolve TS error: Property 'cwd' does not exist on type 'Process'
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    // CRITICAL: Sets base to './' so assets link correctly in GitHub Pages subdirectories
    base: './', 
    define: {
      // Stringify the key to safely inject it during build.
      // This replaces 'process.env.API_KEY' in the code with the actual value from your environment/secrets.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || '')
    }
  };
});
