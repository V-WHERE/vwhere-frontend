import { buildCourseBudget } from './budget_builder.mjs'
export const STORAGE_KEY = 'vwhere.course-selection.v1'
export const provinceNames = {'11':'서울','12':'광주·전남','26':'부산','27':'대구','28':'인천','30':'대전','31':'울산','36':'세종','41':'경기','43':'충북','44':'충남','47':'경북','48':'경남','50':'제주','51':'강원','52':'전북'}
// Display-only names cross-checked against every matching public July catalog city.
// Keep M3 region IDs/aggregation boundaries unchanged (city-level records stay city-level).
const cityNames = {'41-41110':'수원시','41-41130':'성남시','41-41170':'안양시','41-41190':'부천시','41-41270':'안산시','41-41280':'고양시','41-41460':'용인시','41-41590':'화성시','43-43110':'청주시','44-44130':'천안시','47-47110':'포항시','48-48120':'창원시','52-52110':'전주시'}
export const provinceOf = key => key === 'ALL' ? 'ALL' : key.split('-')[0]
export function regionLabel(key, regions, full = true) {
  if (key === 'ALL') return '전국'
  const name = regions.find(r => r.region_key === key)?.region_name || cityNames[key] || `지역명 미제공 (${key})`
  return full ? `${provinceNames[provinceOf(key)] ?? ''} ${name}`.trim() : name
}
export function validCourses(catalog) {
  return catalog.records.filter(r => r.observed_month === catalog.observed_month && r.date_overlaps_observed_month &&
    (r.cap_krw === undefined || r.cap_krw === catalog.cap_krw) && Number.isFinite(r.price_krw) && r.price_krw > 0)
}
export function partnerIds(catalog) {
  const rows = validCourses(catalog), cheapest = new Map()
  for (const row of rows) {
    const pair = cheapest.get(row.region_key) ?? []
    if (!pair.some(r => r.id === row.id)) pair.push(row)
    pair.sort((a,b) => a.price_krw - b.price_krw)
    cheapest.set(row.region_key, pair.slice(0,2))
  }
  return new Set(rows.filter(r => (cheapest.get(r.region_key) ?? []).some(c => c.id !== r.id && r.price_krw+c.price_krw <= catalog.cap_krw)).map(r => r.id))
}
export function discoverCourses(catalog, {region='ALL', province='ALL', sport='ALL', query='', belowOnly=false, partnersOnly=false, sort='name'} = {}, partners = partnerIds(catalog)) {
  const terms = query.normalize('NFKC').toLocaleLowerCase('ko').trim().split(/\s+/).filter(Boolean)
  const rows = validCourses(catalog).filter(r => (region === 'ALL' || r.region_key === region) &&
    (province === 'ALL' || provinceOf(r.region_key) === province) && (sport === 'ALL' || r.sport_key === sport) &&
    (!belowOnly || r.price_krw < catalog.cap_krw) && (!partnersOnly || partners.has(r.id)) &&
    terms.every(t => `${r.course_name} ${r.facility_name} ${r.sport_name}`.normalize('NFKC').toLocaleLowerCase('ko').includes(t)))
  return rows.sort((a,b) => (sort === 'price' ? a.price_krw-b.price_krw : 0) || a.course_name.localeCompare(b.course_name,'ko') || a.id.localeCompare(b.id))
}
export function restoreIds(catalog, ids) {
  const valid = new Map(validCourses(catalog).map(r => [r.id,r]))
  const result = []
  let total = 0, region
  for (const id of Array.isArray(ids) ? ids : []) {
    const row = valid.get(id)
    if (!row || result.includes(id) || (region && row.region_key !== region)) continue
    if (result.length && total + row.price_krw > catalog.cap_krw) continue
    result.push(id); total += row.price_krw; region = row.region_key
  }
  return result
}
export function readSelection(storage) {
  try {
    const value = JSON.parse(storage.getItem(STORAGE_KEY))
    if (value?.version !== 1 || !/^\d{6}$/.test(value.month) || !Array.isArray(value.ids) || !value.ids.every(id => typeof id === 'string')) return null
    return {month:value.month, ids:value.ids, region:typeof value.region === 'string' ? value.region : 'ALL', sport:typeof value.sport === 'string' ? value.sport : 'ALL'}
  } catch { return null }
}
export function selectionText(catalog, ids, regions) {
  const b = buildCourseBudget(catalog, ids), won = n => `${n.toLocaleString('ko-KR')}원`
  if (!b.selected.length) return ''
  return [`V:WHERE · 내 강좌 조합`, `${catalog.observed_month.slice(0,4)}년 ${Number(catalog.observed_month.slice(4))}월 게시가격 · ${regionLabel(b.selected[0].region_key, regions)}`,
    ...b.selected.map((r,i) => `${i+1}. ${r.course_name} / ${r.facility_name} / ${won(r.price_krw)}`),
    `합계 ${won(b.total_price_krw)} · ${b.over_cap_krw ? '한도 초과 '+won(b.over_cap_krw) : '남는 한도 '+won(b.remaining_cap_krw)}`,
    '같은 시군구의 게시가격 조합 후보입니다. 모집 여부·시간표·최종 가격은 공식 사이트에서 확인하세요.',
    'https://dvoucher.kspo.or.kr/main.do'].join('\n')
}
export function simulationSummary(sim, scope, unit) {
  if (sim?.status !== 'ok') return ''
  const frozen = sim.scenarios.find(s => s.key === 'freeze'), full = sim.scenarios.find(s => s.key === 'full')
  const label = unit === 'unique_course' ? '강좌' : '월별 기록', count = unit === 'unique_course' ? '개' : '건'
  return `${scope}에서 한도를 ${sim.target_cap_krw.toLocaleString('ko-KR')}원으로 바꾸면, 가격 동결 가정의 한도 내 ${label}${unit === 'unique_course' ? '는' : '은'} ${frozen.eligible_count.toLocaleString('ko-KR')}${count}, 전액 상승 가정에서는 ${full.eligible_count.toLocaleString('ko-KR')}${count}입니다.`
}

// Sum disjoint district histograms; retain the existing M5 scenario algorithm.
export function provinceBins(bins, province, sport) {
  if (province === 'ALL') return bins
  const groups = bins.groups.filter(g => g.sport_key === sport && provinceOf(g.region_key) === province)
  if (!groups.length) return {...bins,groups:[]}
  const counts = new Map()
  for (const group of groups) for (const [price,n] of group.price_bins) counts.set(price,(counts.get(price) ?? 0)+n)
  return {...bins,groups:[{region_key:'ALL',sport_key:sport,denominator:groups.reduce((n,g)=>n+g.denominator,0),price_bins:[...counts].sort((a,b)=>a[0]-b[0])}]}
}
