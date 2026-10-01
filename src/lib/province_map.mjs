// M5 rows already use the agreed 2026 regional codes. Never average ratios.
export function summarizeRegions(rows) {
  const totals = rows.reduce((a, row) => ({
    denominator: a.denominator + row.denominator,
    at: a.at + row.at_cap_count,
    below: a.below + row.below_cap_count,
    over: a.over + row.over_cap_count,
  }), { denominator: 0, at: 0, below: 0, over: 0 })
  return { ...totals, ratio: totals.denominator > 0 ? totals.at / totals.denominator : null }
}

export function provinceCode(regionKey) {
  return regionKey === 'ALL' ? 'ALL' : regionKey.split('-')[0]
}

export function groupProvinces(rows) {
  const groups = new Map()
  for (const row of rows) {
    if (row.region_key === 'ALL') continue
    const code = provinceCode(row.region_key)
    const group = groups.get(code) ?? []
    group.push(row)
    groups.set(code, group)
  }
  return new Map([...groups].map(([code, group]) => [code, summarizeRegions(group)]))
}

export const MAP_COLORS = ['#deebfc', '#b1cdf4', '#7da9e7', '#497bcc', '#24479b']

export function mapColor(ratio) {
  if (ratio === null) return 'url(#no-map-records)'
  return MAP_COLORS[Math.min(4, Math.max(0, Math.floor(ratio * 5)))]
}

export function rankRegions(rows) {
  return [...rows].sort((a, b) => b.at_cap_ratio - a.at_cap_ratio || b.denominator - a.denominator || a.region_key.localeCompare(b.region_key))
}
