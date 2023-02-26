/**
 * 统一封装对外的接口
 */

import SessionStorageAPI from './sessionstorage';
import LocalStorageAPI from './localstorage';
import CookieAPI from './cookie';

export interface StorageType {
    set(key: string, value: string): void;
    get(key: string): string;
    remove(key: string): void;
    setExpire?(key: string, value: string, expire: number): void;
    getExpire?(key: string): string;
}

export default (type?: string): StorageType => {
    let UseStore;
    switch (type) {
        case 'session':
            UseStore = LocalStorageAPI;
            break;
        case 'cookie':
            UseStore = CookieAPI;
            break;
        case 'localstorage':
            UseStore = LocalStorageAPI;
            break;
        default:
            UseStore = SessionStorageAPI;
            break;
    }
    return new UseStore();
};
