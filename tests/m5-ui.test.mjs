import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { findCompanions, simulateFromBins } from '../src/lib/m5_logic.mjs'
import { compareNullableKo } from '../src/lib/sort.mjs'

const read = (path) => JSON.parse(fs.readFileSync(new URL(`../public/data/${path}`, import.meta.url), 'utf8'))

test('기본월과 다른 월의 공개 카탈로그가 계약과 일치한다', () => {
  const meta = read('meta.json')
  assert.equal(meta.default_catalog_month, '202607')
  for (const month of meta.available_catalog_months) {
    const catalog = read(`catalog/${month.month}.json`)
    assert.equal(catalog.schema_version, 'm5-v1')
    assert.equal(catalog.observed_month, month.month)
    assert.equal(catalog.records.length, month.priced_records)
  }
})

test('배포용 강좌명에는 개인 결제·연락처 단서가 없다', () => {
  const months = read('meta.json').available_catalog_months
  const privateTitlePattern = /개인\s*결[제재]|핸드폰|휴대폰|휴대전화|전화번호|연락처|뒷\s*4\s*자리|[가-힣][*＊][가-힣]|0(?:10|11|16|17|18|19)[- .]?\d{3,4}[- .]?\d{4}|운동발달\s+[가-힣]{2,4}(?:님)?$/i
  for (const { month } of months) {
    const catalog = read(`catalog/${month}.json`)
    assert.ok(catalog.records.every((item) => !privateTitlePattern.test(item.course_name ?? '')), month)
  }
})

test('가격 조합은 한도 경계를 포함하고 동일 ID·다른 지역·날짜 비겹침을 제외한다', () => {
  const catalog = { observed_month: '202607', cap_krw: 110000, records: [
    { id: 'a', observed_month: '202607', region_key: 'x', sport_key: 's', price_krw: 70000, date_overlaps_observed_month: true },
    { id: 'b', observed_month: '202607', region_key: 'x', sport_key: 't', price_krw: 40000, date_overlaps_observed_month: true },
    { id: 'c', observed_month: '202607', region_key: 'x', sport_key: 't', price_krw: 40001, date_overlaps_observed_month: true },
    { id: 'd', observed_month: '202607', region_key: 'y', sport_key: 't', price_krw: 10000, date_overlaps_observed_month: true },
    { id: 'e', observed_month: '202607', region_key: 'x', sport_key: 't', price_krw: 10000, date_overlaps_observed_month: false },
  ] }
  const result = findCompanions(catalog, 'a')
  assert.deepEqual(result.candidates.map((item) => item.id), ['b'])
  assert.equal(result.candidates[0].combined_price_krw, 110000)
  assert.equal(result.candidates[0].remaining_cap_after_pair_krw, 0)
})

test('가격 조합 결과 0은 정상적인 빈 결과로 반환한다', () => {
  const catalog = { observed_month: '202607', cap_krw: 110000, records: [
    { id: 'a', observed_month: '202607', region_key: 'x', sport_key: 's', price_krw: 100000, date_overlaps_observed_month: true },
    { id: 'b', observed_month: '202607', region_key: 'x', sport_key: 't', price_krw: 10001, date_overlaps_observed_month: true },
  ] }
  const result = findCompanions(catalog, 'a')
  assert.equal(result.total_candidates, 0)
  assert.deepEqual(result.candidates, [])
  assert.equal(result.reason, 'no_price_pair_in_scope')
})

test('대표 시뮬레이션 값이 reference와 일치한다', () => {
  const reference = read('simulation_reference.json')
  const result = simulateFromBins(read('sim_bins/2026_unique_course.json'), reference.target_cap_krw)
  assert.equal(result.status, 'ok')
  assert.deepEqual(result.scenarios.map((item) => item.eligible_count), reference.scenarios.map((item) => item.eligible_count))
  assert.deepEqual(result.scenarios.map((item) => item.newly_eligible_count), reference.scenarios.map((item) => item.newly_eligible_count))
  assert.deepEqual(result.scenarios.map((item) => item.at_new_cap_count), reference.scenarios.map((item) => item.at_new_cap_count))
})

test('가상 한도와 집계단위 변경은 해당 bins 결과를 갱신한다', () => {
  const unique = simulateFromBins(read('sim_bins/2026_unique_course.json'), 130000)
  const monthly = simulateFromBins(read('sim_bins/2026_monthly_record.json'), 130000)
  assert.equal(unique.status, 'ok')
  assert.equal(monthly.status, 'ok')
  assert.deepEqual(unique.scenarios.map((item) => item.eligible_count), [8087, 8006, 7856])
  assert.notDeepEqual(monthly.scenarios.map((item) => item.eligible_count), unique.scenarios.map((item) => item.eligible_count))
})

test('지도 각 셀의 비율·분모와 전국 합계가 일치한다', () => {
  const document = read('map/2026_unique_course.json')
  const national = document.records.find((item) => item.region_key === 'ALL' && item.sport_key === 'ALL')
  const children = document.records.filter((item) => item.region_key !== 'ALL' && item.sport_key === 'ALL')
  assert.equal(children.reduce((sum, item) => sum + item.denominator, 0), national.denominator)
  assert.equal(children.reduce((sum, item) => sum + item.at_cap_count, 0), national.at_cap_count)
  for (const row of children) assert.ok(Math.abs(row.at_cap_ratio - row.at_cap_count / row.denominator) < 1e-8)
})

test('지도 데이터는 실제 0%와 표본 적음을 구분한다', () => {
  const rows = read('map/2026_unique_course.json').records
    .filter((item) => item.region_key !== 'ALL' && item.sport_key === 'ALL')
  assert.ok(rows.some((item) => item.denominator > 0 && item.at_cap_count === 0 && item.at_cap_ratio === 0))
  assert.ok(rows.some((item) => item.small_sample && item.denominator < 30))
  assert.ok(rows.every((item) => item.small_sample === (item.denominator < 30)))
})

test('과거 가격 구성은 개별 연도와 계약된 기간 합계를 포함한다', () => {
  const history = read('history.json').national
  for (const unit of ['unique_course', 'monthly_record']) {
    const keys = Object.keys(history)
      .filter((key) => key.startsWith(`${unit}:`))
      .map((key) => key.split(':')[1])
    assert.deepEqual(keys.filter((key) => /^\d{4}$/.test(key)).sort(), ['2020', '2021', '2022', '2023', '2024', '2025', '2026'])
    assert.ok(keys.includes('2024plus'))
    assert.ok(keys.includes('all_observed'))
    assert.ok(history[`${unit}:2024plus`].denominator > 0)
    assert.ok(history[`${unit}:all_observed`].denominator > 0)
  }
})

test('지역 이름 정렬은 null과 undefined를 뒤로 보낸다', () => {
  const names = ['마포구', null, '강남구', undefined, '']
  names.sort(compareNullableKo)
  assert.deepEqual(names.slice(0, 2), ['강남구', '마포구'])
  assert.ok(names.slice(2).every((name) => name == null || name === ''))
})
