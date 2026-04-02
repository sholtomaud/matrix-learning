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
    }
  ]
};
