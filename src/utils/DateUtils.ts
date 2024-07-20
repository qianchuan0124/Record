import L10n from "@/configs/L10n.json";

// 判断某个日期是否在两个日期之间
export function isBetweenDates(date: Date, startDate: Date, endDate: Date) {
    return date >= startDate && date <= endDate;
}

// 年月日格式化输出
export function formatDate(date: Date) {
    const formatDate = new Date(date);
    const day = formatDate.getDate();
    const month = formatDate.getMonth() + 1; // 月份是从0开始的
    const year = formatDate.getFullYear();
    return `${year}${L10n.year_unit}${month}${L10n.month_unit}${day}${L10n.day_unit}`; // 返回格式化后的日期
}

// 2024/5/6
export function formatDateBySlash(date: Date) {
    const formatDate = new Date(date);
    const day = formatDate.getDate();
    const month = formatDate.getMonth() + 1; // 月份是从0开始的
    const year = formatDate.getFullYear();
    return `${day}/${month}/${year}`; // 返回格式化后的日期
}

// 2024.5.7
export function formatDateByDot(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}.${month}.${day}`;
}

// 判断两个Date是否相等，只要年月日相等即可
export function isSameDate(date1: Date, date2: Date): Boolean {
    const dateLeft = new Date(date1);
    dateLeft.setHours(0, 0, 0, 0);
    const dateRight = new Date(date2);
    dateRight.setHours(0, 0, 0, 0);
    return dateLeft.getFullYear() === dateRight.getFullYear() &&
        dateLeft.getMonth() === dateRight.getMonth() &&
        dateLeft.getDate() === dateRight.getDate();
}