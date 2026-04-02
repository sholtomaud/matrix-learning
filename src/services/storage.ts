/**
 * @service StorageService
 * @description Handles complex data persistence using IndexedDB.
 */
export class StorageService {
    private dbName = 'MatrixMapperDB';
    private version = 1;

    async openDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('matrices')) {
                    db.createObjectStore('matrices', { keyPath: 'id' });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async save(id: string, data: any): Promise<void> {
        const db = await this.openDB();
        const tx = db.transaction('matrices', 'readwrite');
        tx.objectStore('matrices').put({ id, data, timestamp: Date.now() });
        return new Promise((res) => (tx.oncomplete = () => res()));
    }

    async load(id: string): Promise<any> {
        const db = await this.openDB();
        return new Promise((resolve) => {
            const req = db.transaction('matrices').objectStore('matrices').get(id);
            req.onsuccess = () => resolve(req.result?.data || null);
        });
    }
}