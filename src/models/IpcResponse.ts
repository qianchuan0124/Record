export interface IpcResponse {
    type: 'success' | 'error';
    error?: string;
    data?: any;
}

export const IpcType = {
    TOTAL_AMOUNT_BY_DATE_RANGE: "TOTAL_AMOUNT_BY_DATE_RANGE",
    CREATE_RECORD: "CREATE_RECORD",
    FETCH_RECORDS_BY_FILTER: "FETCH_RECORDS_BY_FILTER",
    TOTAL_AMOUNT: "TOTAL_AMOUNT",
    UPDATE_RECORD: "UPDATE_RECORD",
    DELETE_RECORD: "DELETE_RECORD",
    YEARLY_DATA: "YEARLY_DATA",
    TOTAL_CATEGORY_AMOUNT: "TOTAL_CATEGORY_AMOUNT",
    CATGORY_DATA: "CATGORY_DATA",
    YEARLY_CATEGORY_DATA: "YEARLY_CATEGORY_DATA",
    TIME_LINE_DATA: "TIME_LINE_DATA",
    ALL_RECORDS_DESC: "ALL_RECORDS_DESC",
    SAVE_CUSTOM_CATEGORY: "SAVE_CUSTOM_CATEGORY",
    IMPORT_RECORDS: "IMPORT_RECORDS",
    PATCH_DELETE_RECORDS: "PATCH_DELETE_RECORDS",
    FETCH_CUSTOM_CATEGORY: "FETCH_CUSTOM_CATEGORY",
    UPDATE_DOWNLOAD: "UPDATE_DOWNLOAD",
    UPDATE_INSTALL: "UPDATE_INSTALL",
    OPEN_DATABASE_DIR: "OPEN_DATABASE_DIR",
    OPEN_LOG_DIR: "OPEN_LOG_DIR",
    COPY_MAIL_INFO: "COPY_MAIL_INFO",
    UPDATE_AVAILABLE: "UPDATE_AVAILABLE",
    DOWNLOAD_PROGRESS: "DOWNLOAD_PROGRESS",
    UPDATE_DOWNLOADED: "UPDATE_DOWNLOADED",
}