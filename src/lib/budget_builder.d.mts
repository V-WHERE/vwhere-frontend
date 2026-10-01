import type { Catalog, CatalogRecord } from '../types'
export type BudgetCandidate = CatalogRecord & { combined_price_krw:number; remaining_cap_after_add_krw:number }
export type CourseBudget = {selected:CatalogRecord[];total_price_krw:number;remaining_cap_krw:number;over_cap_krw:number;candidates:BudgetCandidate[]}
export function buildCourseBudget(catalog:Catalog,selectedIds:string[]):CourseBudget
