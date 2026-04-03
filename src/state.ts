export interface Proposition {
    id: number;
    text: string;
    position?: number;
    cluster?: string;
    llmGenerated?: boolean;
    isSynthetic?: boolean;
    justification?: string;
}

export interface Relation {
    from: number;
    to: number;
    type: 'assoc' | 'disc' | 'dep' | 'gap';
    justification?: string;
    strength?: number;
    llmGenerated?: boolean;
}

export interface Cluster {
    label: string;
    ids: number[];
}

export interface MatrixData {
    title: string;
    source?: string;
    genre: string;
    propositions: Proposition[];
    relations: Relation[];
    clusters?: Cluster[];
}

export interface AppState {
    currentData: MatrixData | null;
    proposedData: MatrixData | null;
    sourceText: string;
    proposedText: string;
    apiProvider: string;
    apiKey: string;
    logLines: string[];
    isLoopRunning: boolean;
    paretoFront: any[];
}

type StateObserver = (state: AppState) => void;

class StateManager {
    private state: AppState = {
        currentData: null,
        proposedData: null,
        sourceText: '',
        proposedText: '',
        apiProvider: 'anthropic',
        apiKey: '',
        logLines: [],
        isLoopRunning: false,
        paretoFront: [],
    };

    private observers: StateObserver[] = [];

    getState(): AppState {
        return { ...this.state };
    }

    setState(patch: Partial<AppState>) {
        this.state = { ...this.state, ...patch };
        this.notify();
    }

    subscribe(observer: StateObserver) {
        this.observers.push(observer);
        observer(this.state);
        return () => {
            this.observers = this.observers.filter(o => o !== observer);
        };
    }

    private notify() {
        this.observers.forEach(o => o(this.state));
    }

    log(message: string) {
        const timestamp = new Date().toLocaleTimeString();
        const line = `[${timestamp}] ${message}`;
        this.setState({ logLines: [...this.state.logLines, line] });
    }
}

export const stateManager = new StateManager();
