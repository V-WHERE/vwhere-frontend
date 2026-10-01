import { useMemo, useState } from 'react'
import boundaries from '../data/korea-provinces.json'
import { groupProvinces, mapColor, MAP_COLORS, provinceCode, rankRegions, summarizeRegions } from '../lib/province_map.mjs'
import type { Lookups, MapRecord } from '../types'
import './ProvincePriceMap.css'

type Props = {
  selectedProvince: string
  setSelectedProvince: (code: string) => void
  rows: MapRecord[]
  lookups: Lookups
  unit: 'unique_course' | 'monthly_record'
  region: string
  onRegionChange: (region: string) => void
}
const percent = (value: number | null) => value === null ? '기록 없음' : `${(value * 100).toFixed(1)}%`
const count = (value: number) => value.toLocaleString('ko-KR')

export function ProvincePriceMap({ selectedProvince, setSelectedProvince, rows, lookups, unit, region, onRegionChange }: Props) {
  const [showAll, setShowAll] = useState(false)
  const active = region === 'ALL' ? selectedProvince : provinceCode(region)
  const groups = useMemo(() => groupProvinces(rows), [rows])
  const provinceRows = active === 'ALL' ? rows : rows.filter((r) => provinceCode(r.region_key) === active)
  const detailRows = region === 'ALL' ? provinceRows : rows.filter((r) => r.region_key === region)
  const summary = summarizeRegions(detailRows)
  const unitLabel = unit === 'unique_course' ? '고유 강좌' : '월별 기록'
  const provinceName = boundaries.features.find((f) => f.code === active)?.name ?? '전국'
  const regionName = (key: string) => lookups.regions.find((r) => r.region_key === key)?.region_name ?? `지역명 미제공 (${key})`
  const detailName = region === 'ALL' ? provinceName : regionName(region)
  const ranked = rankRegions(provinceRows)
  const visibleRows = showAll ? ranked : ranked.slice(0, 3)
  const chooseProvince = (code: string) => {
    setSelectedProvince(code)
    onRegionChange('ALL')
    setShowAll(false)
  }
  const slices = [
    { label: '한도와 같음', value: summary.at, color: '#24479b' },
    { label: '한도 미만', value: summary.below, color: '#80b1ee' },
    { label: '한도 초과', value: summary.over, color: '#d9e6f7' },
  ]
  return (
    <div className="province-layout">
      <div className="province-map-card">
        <div className="province-map-tools">
          <span>지역을 눌러 자세히 보기</span>
          <button onClick={() => chooseProvince('ALL')}>전국 보기</button>
        </div>
        <svg className="province-map-svg" viewBox={`0 0 ${boundaries.width} ${boundaries.height}`} role="group" aria-label="지역별 한도가격 비율 지도. 지역을 선택하면 오른쪽 상세가 갱신됩니다.">
          <defs>
            <pattern id="no-map-records" width="7" height="7" patternUnits="userSpaceOnUse">
              <rect width="7" height="7" fill="#e6e9ed" />
              <path d="M-1 1L1-1M0 7L7 0M6 8L8 6" stroke="#c1c8d2" strokeWidth="1" />
            </pattern>
          </defs>
          <text x="108" y="416" className="sea-label" aria-hidden="true">서해</text>
          <text x="587" y="253" className="sea-label" aria-hidden="true">동해</text>
          <rect x="531" y="47" width="119" height="99" rx="10" className="island-inset" />
          <text x="590" y="134" textAnchor="middle" className="inset-label">울릉도·독도</text>
          {boundaries.features.map((feature) => {
            const totals = groups.get(feature.code)
            const ratio = totals?.ratio ?? null
            const small = !!totals && totals.denominator > 0 && totals.denominator < 30
            const selected = active === feature.code
            const label = `${feature.name}, ${percent(ratio)}${totals ? `, ${unitLabel} ${count(totals.denominator)}건` : ''}${small ? ', 표본 적음' : ''}`
            return (
              <g key={feature.code} role="button" tabIndex={0} aria-label={label} aria-pressed={selected}
                className={`province-region${selected ? ' is-selected' : ''}${small ? ' is-small' : ''}`}
                onClick={() => chooseProvince(feature.code)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); chooseProvince(feature.code) }
                }}>
                <title>{label}</title>
                <path d={feature.path} fill={mapColor(ratio)} fillRule="evenodd" className="province-shape" />
              </g>
            )
          })}
          {/* Labels also provide a larger pointer target for metropolitan regions. */}
          {boundaries.features.map((feature) => {
            const selected = active === feature.code
            const ratio = groups.get(feature.code)?.ratio ?? null
            const [x, y] = feature.label
            const width = feature.name.length > 3 ? 94 : 59
            return (
              <g key={feature.code} aria-hidden="true" className={`province-label${selected ? ' is-selected' : ''}`} onClick={() => chooseProvince(feature.code)}>
                {feature.callout && <line x1={feature.anchor[0]} y1={feature.anchor[1]} x2={x} y2={y} />}
                <rect x={x - width / 2} y={y - 16} width={width} height="32" rx="16" />
                <text x={x} y={y + 5} textAnchor="middle">{feature.name}</text>
                {ratio === null && <circle cx={x + width / 2 - 4} cy={y - 12} r="4" fill="#8391a3" />}
              </g>
            )
          })}
        </svg>
        <div className="province-legend" aria-label="지도 범례">
          <div className="color-scale"><span>0%</span>{MAP_COLORS.map((color, i) => <i key={color} style={{ background: color }} title={`${i * 20}~${(i + 1) * 20}%`} />)}<span>100%</span><b>한도가격 비율</b></div>
          <div className="map-keys"><span><i className="small-key" />30건 미만</span><span><i className="empty-key" />기록 없음</span><span><i className="selected-key" />선택 지역</span></div>
        </div>
        <p className="boundary-note">2026.07 경계 기준 · 울릉도·독도 별도 위치 표시</p>
        <details className="map-attribution"><summary>지도 출처</summary><p>통계청 <a href="https://sgis.kostat.go.kr" target="_blank" rel="noreferrer">SGIS</a> 공공누리 제1유형 행정동 경계 · 가공: <a href="https://github.com/vuski/admdongkor" target="_blank" rel="noreferrer">vuski/admdongkor</a> (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>). V:WHERE에서 도형 단순화·투영 및 도서 위치 조정.</p></details>
      </div>
      <aside className="province-detail" aria-label="선택 지역 상세">
        <label className="province-select">지도 지역<select value={active} onChange={(event) => chooseProvince(event.target.value)}><option value="ALL">전국</option>{boundaries.features.map((f) => <option value={f.code} key={f.code}>{f.name}</option>)}</select></label>
        <div className="region-heading"><h3>{detailName}</h3>{region !== 'ALL' && <button onClick={() => chooseProvince(active)}>{provinceName} 전체</button>}</div>
        {active === '12' && <p className="province-merged">광주·전남 통합 집계</p>}
        <div className="province-stat" role="status">
          <p>가격이 월 한도와 같은 강좌 비율</p><strong>{percent(summary.ratio)}</strong>
          <span>{unitLabel} <b>{count(summary.denominator)}건</b>{summary.denominator > 0 && summary.denominator < 30 && <em>표본 적음</em>}</span>
        </div>
        {summary.denominator > 0 ? <div className="province-distribution"><h4>한도가격 분포</h4><div className="distribution-track" aria-hidden="true">{slices.map((s) => <i key={s.label} style={{ width: `${s.value / summary.denominator * 100}%`, background: s.color }} />)}</div><ul>{slices.map((s) => <li key={s.label}><i style={{ background: s.color }} /><span>{s.label}</span><b>{percent(s.value / summary.denominator)}</b><small>{count(s.value)}건</small></li>)}</ul></div> : <p className="province-empty">선택 기간·종목에 해당하는 가격 기록이 없습니다.</p>}
        <div className="province-table-head"><h4>{provinceName} 시군구별 비율</h4><span>{showAll ? '전체' : '상위 3곳'}</span></div>
        <div className="province-table-scroll"><table><caption className="sr-only">{provinceName} 시군구별 한도가격 비율과 {unitLabel} 수</caption><thead><tr><th scope="col">시군구</th><th scope="col">한도가격 비율</th><th scope="col">{unitLabel}</th></tr></thead><tbody>{visibleRows.map((r) => <tr key={r.region_key} className={r.region_key === region ? 'selected-district' : ''}><th scope="row"><button aria-pressed={r.region_key === region} onClick={() => onRegionChange(r.region_key)}>{regionName(r.region_key)}</button>{r.small_sample && <small>표본 적음</small>}</th><td>{percent(r.at_cap_ratio)}</td><td>{count(r.denominator)}건</td></tr>)}</tbody></table>{!visibleRows.length && <p className="province-empty">해당하는 시군구 기록이 없습니다.</p>}</div>
        {ranked.length > 3 && <button className="province-more" onClick={() => setShowAll(!showAll)}>{showAll ? '상위 3곳만 보기' : `시군구 전체 보기 (${ranked.length}곳)`} <span aria-hidden="true">→</span></button>}
        <p className="province-table-note">시군구를 선택하면 아래 시뮬레이션 지역에도 적용됩니다.</p>
      </aside>
    </div>
  )
}
