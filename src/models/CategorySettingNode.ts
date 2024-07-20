export interface CategorySettingNode {
    id: string,
    label: string,
    level: number,
    children?: CategorySettingNode[]
}