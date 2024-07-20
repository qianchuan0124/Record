import { Record } from "@/models/Record";

export enum NotifyType {
    IMPORT_DATA_SUCCESS = "IMPORT_DATA_SUCCESS",
    CREATE_RECORD_SUCCESS = "CREATE_RECORD_SUCCESS",
    UPDATE_RECORD_SUCCESS = "UPDATE_RECORD_SUCCESS",
    DELETE_RECORD_SUCCESS = "DELETE_RECORD_SUCCESS",
    CATEGORY_DATA_UPDATE = "CATEGORY_DATA_UPDATE",
}


class NotifyCenter {
    private listeners: { [key: string]: Function[] } = {};

    on(event: string, listener: Function) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);
    }

    off(event: string, listener: Function) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(l => l !== listener);
        }
    }

    emit(event: string, ...args: any[]) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(listener => listener(...args));
        }
    }
}

export const notifyCenter = new NotifyCenter();

export type RecordChangeType = NotifyType.CREATE_RECORD_SUCCESS | NotifyType.UPDATE_RECORD_SUCCESS | NotifyType.DELETE_RECORD_SUCCESS;

export function sendRecordChangeNotify(type: RecordChangeType, changedRecord: Record) {
    notifyCenter.emit(type, changedRecord);
}