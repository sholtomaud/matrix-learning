/**
 * @element matrix-router
 * @description Handles client-side routing using the History API.
 */
export class MatrixRouter extends HTMLElement {
    private routes: Record<string, string> = {
        '/': 'matrix-main-view',
        '/schema': 'matrix-schema-view',
        '/prompt': 'matrix-prompt-view'
    };

    connectedCallback() {
        window.addEventListener('popstate', () => this.resolveRoute());
        this.resolveRoute();

        // Global link interceptor for internal routing
        document.body.addEventListener('click', (e) => {
            const target = e.composedPath()[0] as HTMLElement;
            if (target.tagName === 'A' && target.hasAttribute('data-link')) {
                e.preventDefault();
                const href = target.getAttribute('href')!;
                this.navigate(href);
            }
        });
    }

    navigate(path: string) {
        window.history.pushState({}, '', path);
        this.resolveRoute();
    }

    private resolveRoute() {
        const path = window.location.pathname;
        const componentName = this.routes[path] || this.routes['/'];

        // Non-destructive update: only replace if component changed
        if (this.firstChild?.nodeName.toLowerCase() !== componentName) {
            this.innerHTML = '';
            const view = document.createElement(componentName);
            this.appendChild(view);
        }
    }
}

customElements.define('matrix-router', MatrixRouter);