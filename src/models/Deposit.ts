export interface DepositBank {
    id: number;
    name: string;
    icon: string;
    isDeleted?: boolean;
    syncId?: number;
}

export interface DepositRecord {
    id: number;
    bankId?: number;
    bankKey: string;
    startDate: number;
    amount: number;
    years: number;
    rate: number;
    interest: number;
    sortOrder: number;
    isDeleted?: boolean;
    syncId?: number;
}

export interface DepositData {
    banks: DepositBank[];
    deposits: DepositRecord[];
}

export interface BankOption {
    key: string;
    name: string;
    icon: string;
    customId?: number;
}
