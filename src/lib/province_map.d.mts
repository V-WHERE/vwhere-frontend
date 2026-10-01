import type { MapRecord } from '../types'
export type RegionTotals = { denominator: number; at: number; below: number; over: number; ratio: number | null }
export function summarizeRegions(rows: MapRecord[]): RegionTotals
export function provinceCode(regionKey: string): string
export function groupProvinces(rows: MapRecord[]): Map<string, RegionTotals>
export const MAP_COLORS: string[]
export function mapColor(ratio: number | null): string
export function rankRegions(rows: MapRecord[]): MapRecord[]
