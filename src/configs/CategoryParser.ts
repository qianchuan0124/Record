import CategoryData from './Category.json'
import TypeData from './Type.json'
import CategoryIcon from './CategoryIcon.json'
import { notifyCenter, NotifyType } from '../utils/NotifyCenter';
import { fetchCustomCategory } from "@/utils/DataCenter";
import { CategoryNodeItem } from "@/models/CategoryNodeItem"

export interface CategoryItem {
    label: string;
    value: string;
    children?: CategoryItem[]; // 递归定义以支持嵌套
}

const defaultCategory: CategoryNodeItem[] = CategoryData.default; // 访问实际的数组
let currentCategory: CategoryNodeItem[] = defaultCategory;

updateCurrentCategory();

export async function updateCurrentCategory() {
    try {
        // 以json格式发送post请求，用record填充请求体
        const data = await fetchCustomCategory();
        if (data != null && data.length > 0) {
            currentCategory = data as CategoryNodeItem[]
            notifyCenter.emit(NotifyType.CATEGORY_DATA_UPDATE);
        }
    }
    catch (error: unknown) {
        currentCategory = defaultCategory
        console.log("updateCategory failed, error:", error)
    }
}

// 转换数据格式
export function getCategories(): CategoryItem[] {
    return currentCategory.map((item: CategoryItem) => ({
        label: item.label,
        value: item.value,
        children: item.children ? item.children.map((child: CategoryItem) => ({
            label: child.label,
            value: child.value,
            // 如果有更深层次的嵌套，这里可以继续递归转换
        })) : undefined,
    }));
}

export const defaultCategories: CategoryItem[] = defaultCategory.map((item: CategoryItem) => ({
    label: item.label,
    value: item.value,
    children: item.children ? item.children.map((child: CategoryItem) => ({
        label: child.label,
        value: child.value,
        // 如果有更深层次的嵌套，这里可以继续递归转换
    })) : undefined,
}));


// 获取category的第一个item
export function getFirstCategoryItem(): string[] {
    const categories = getCategories();
    if (categories.length >= 1) {
        const first = categories[0].value
        const sencod = categories[0].children ? categories[0].children[0].value : ""
        return [first, sencod];
    }
    return []
}

//根据category的value查找对应的label,先从父category中查找，再从子category中查找
export function findCategoryLabelByValue(value: string): string {
    const categories = getCategories();
    for (const category of categories) {
        if (category.value === value) {
            return category.label;
        }
        if (category.children) {
            for (const child of category.children) {
                if (child.value === value) {
                    return child.label;
                }
            }
        }
    }
    return "";
}

export function findCategoryByChildValue(childValue: string): (CategoryItem)[] {
    const categories = getCategories();
    for (const category of categories) {
        const foundChild = category.children?.find(child => child.value === childValue);
        if (foundChild) {
            // 找到匹配的子category，返回父category和子category
            return [category, foundChild];
        }
    }
    // 没有找到匹配项，返回空数组
    return [];
}

interface TypeItem {
    label: string;
    value: string;
}

const Type = TypeData.default;

export const accountTypes: TypeItem[] = Type.map((item: TypeItem) => ({
    label: item.label,
    value: item.value,
}));

export function findTypeByValue(value: string): (TypeItem)[] {
    for (const type of accountTypes) {
        if (type.value === value) {
            return [type];
        }
    }
    return [];
}

// 获取第一个type
export function getFirstTypeItem(): string[] {
    return [accountTypes[0].value];
}

// 根据Type的value查找对应的label
export function findTypeLabelByValue(value: string): string {
    const type = findTypeByValue(value)[0];
    return type ? type.label : "";
}

// 根据Type的label查找对应的value
export function findTypeValueByLabel(label: string): string {
    const type = accountTypes.find(type => type.label === label);
    return type ? type.value : "";
}

export function findCategoryIconByValue(subCategory: string): string {
    const categoryItem = findCategoryByChildValue(subCategory)
    if (categoryItem.length >= 2) {
        const categoryValue = findCategoryByChildValue(subCategory)[0].value;
        const subCategoryValue = findCategoryByChildValue(subCategory)[1].value;
        const icons = CategoryIcon.default;
        for (const icon of icons) {
            if (icon.value === categoryValue) {
                if (icon.children) {
                    for (const child of icon.children) {
                        if (child.value === subCategoryValue) {
                            return child.icon;
                        }
                    }
                }
                return icon.icon;
            }
        }
    }
    return "other_icon.svg";
}