import { provinceNames, provinceOf, regionLabel } from '../lib/discovery.mjs'
import type { Region } from '../types'
type Props = { regions:Region[]; province:string; region:string; onProvince:(value:string)=>void; onRegion:(value:string)=>void }
export function RegionFilter({regions,province,region,onProvince,onRegion}:Props) {
  const active = region === 'ALL' ? province : provinceOf(region)
  const provinces = [...new Set(regions.map(r => provinceOf(r.region_key)))].sort()
  const districts = regions.filter(r => active === 'ALL' || provinceOf(r.region_key) === active).sort((a,b) => regionLabel(a.region_key,regions).localeCompare(regionLabel(b.region_key,regions),'ko'))
  return <>
    <label>시도<select value={active} onChange={e => onProvince(e.target.value)}><option value="ALL">전국</option>{provinces.map(key => <option key={key} value={key}>{provinceNames[key] ?? key}</option>)}</select></label>
    <label>시군구<select value={region} onChange={e => onRegion(e.target.value)}><option value="ALL">{active === 'ALL' ? '전체 시군구' : `${provinceNames[active]} 전체`}</option>{districts.map(r => <option key={r.region_key} value={r.region_key}>{regionLabel(r.region_key,regions)}</option>)}</select></label>
  </>
}
