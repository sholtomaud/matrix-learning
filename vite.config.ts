import { runAgentLogic } from './src/agent';

export default {
  server: {
    port: 3000,
    host: true
  },
  plugins: [
    {
      name: 'agent-logic-plugin',
      buildStart() {
        console.log('Vite build starting, running agent logic...');
        runAgentLogic();
      }
    },
    {
      name: 'fix-ts-mime-type',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.endsWith('.ts')) {
            res.setHeader('Content-Type', 'application/javascript');
          }
          next();
        });
      }
    }
  ]
};
