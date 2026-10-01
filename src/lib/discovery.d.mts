import type {Catalog, CatalogRecord, Region, SimulationResult, BinDocument} from '../types'
export const STORAGE_KEY:string
export const provinceNames:Record<string,string>
export function provinceOf(key:string):string
export function regionLabel(key:string,regions:Region[],full?:boolean):string
export function validCourses(catalog:Catalog):CatalogRecord[]
export function partnerIds(catalog:Catalog):Set<string>
export type DiscoveryFilters={region?:string;province?:string;sport?:string;query?:string;belowOnly?:boolean;partnersOnly?:boolean;sort?:string}
export function discoverCourses(catalog:Catalog,filters?:DiscoveryFilters,partners?:Set<string>):CatalogRecord[]
export function restoreIds(catalog:Catalog,ids:string[]):string[]
export function readSelection(storage:Pick<Storage,'getItem'>):{month:string;ids:string[];region:string;sport:string}|null
export function selectionText(catalog:Catalog,ids:string[],regions:Region[]):string
export function simulationSummary(sim:SimulationResult|null,scope:string,unit:string):string
export function provinceBins(bins:BinDocument,province:string,sport:string):BinDocument
