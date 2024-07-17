export interface CategoryNodeItem {
    label: string;
    value: string;
    children: SubCategoryNodeItem[]
}

interface SubCategoryNodeItem {
    label: string;
    value: string;
}