import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: true, // Permite que o servidor escute em todas as interfaces de rede
    port: 8080,
    // Removendo a configuração hmr explícita para permitir que o ambiente de execução
    // defina o host correto para o WebSocket.
  },
  
  // ==========================================================
  // ADICIONE ESTA SEÇÃO PARA PERMITIR O HOST DE PREVIEW
  // ==========================================================
  preview: {
    allowedHosts: [
      'site-landing3.b9c03f.easypanel.host'
      // Se houverem outros, adicione-os aqui
    ]
  },
  // ==========================================================
  
  plugins: [dyadComponentTagger(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));