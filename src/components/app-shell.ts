import { StorageService } from '../services/storage';
import { Optimizer } from '../services/optimizer';

export class AppShell extends HTMLElement {
    private storage = new StorageService();
    private state = { current: null, proposed: null };

    connectedCallback() {
        this.render();
        this.addEventListener('matrix-update', (e: any) => this.handleUpdate(e.detail));
        this.addEventListener('run-optimizer', () => this.runLoop());
    }

    async handleUpdate(data: any) {
        this.state.current = data;
        await this.storage.saveMatrix('last-session', data);
        this.querySelector('matrix-view').update(this.state);
    }

    async runLoop() {
        const optimizer = new Optimizer(this.state.current);
        for (let gen = 0; gen < 50; gen++) {
            this.state.proposed = optimizer.step();
            this.querySelector('matrix-view').update(this.state);
            await new Promise(r => requestAnimationFrame(r));
        }
    }

    render() {
        this.innerHTML = `
            <header>
                <h1>Conceptual Matrix Mapper</h1>
                <nav>
                    <a href="/" data-link>Matrix</a>
                    <a href="/schema" data-link>Schema</a>
                </nav>
            </header>
            <main class="main-layout">
                <matrix-sidebar></matrix-sidebar>
                <matrix-router></matrix-router>
            </main>
            <matrix-bottom-drawer></matrix-bottom-drawer>
        `;

        // Intercept links for routing
        this.querySelectorAll('[data-link]').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const path = (e.target as HTMLAnchorElement).pathname;
                this.querySelector('matrix-router').navigate(path);
            });
        });
    }
}
customElements.define('matrix-app-shell', AppShell);