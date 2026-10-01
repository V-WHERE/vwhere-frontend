import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { groupProvinces, summarizeRegions, mapColor, rankRegions } from '../src/lib/province_map.mjs'
const boundaries = JSON.parse(fs.readFileSync(new URL('../src/data/korea-provinces.json', import.meta.url)))
const codes = new Set(boundaries.features.map(f => f.code))
const dir = new URL('../public/data/map/', import.meta.url)
test('모든 기간·종목의 시도 합계는 원본 전국 합계와 같고 경계에 빠짐없이 연결된다', () => {
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const { records } = JSON.parse(fs.readFileSync(new URL(file, dir)))
    const before = JSON.stringify(records)
    for (const national of records.filter(r => r.region_key === 'ALL')) {
      const rows = records.filter(r => r.sport_key === national.sport_key)
      const groups = groupProvinces(rows)
      for (const code of groups.keys()) assert.ok(codes.has(code), `${file}: ${code}`)
      for (const [key, field] of [['denominator','denominator'],['at','at_cap_count'],['below','below_cap_count'],['over','over_cap_count']]) {
        assert.equal([...groups.values()].reduce((a, r) => a + r[key], 0), national[field], `${file}/${national.sport_key}/${key}`)
      }
      for (const group of groups.values()) assert.equal(group.ratio, group.at / group.denominator)
    }
    assert.equal(JSON.stringify(records), before)
  }
})
test('경계는 확정된 16개 코드이며 SVG 좌표가 유효하다', () => {
  assert.deepEqual([...codes].sort(), ['11','12','26','27','28','30','31','36','41','43','44','47','48','50','51','52'])
  assert.equal(boundaries.features.length, 16)
  assert.equal(boundaries.boundaryDate, '2026-07-01')
  for (const f of boundaries.features) {
    assert.match(f.path, /^M/)
    assert.ok(!/NaN|Infinity|undefined/.test(f.path))
    assert.ok(f.path.endsWith('Z'))
    assert.ok([...f.label,...f.anchor].every(Number.isFinite))
  }
})
test('비율은 지역별 단순 평균이 아니라 건수로 가중 집계한다', () => {
  const rows = [
    { region_key:'11-a',denominator:1,at_cap_count:1,below_cap_count:0,over_cap_count:0 },
    { region_key:'11-b',denominator:99,at_cap_count:0,below_cap_count:99,over_cap_count:0 },
  ]
  assert.equal(groupProvinces(rows).get('11').ratio, 0.01)
  assert.equal(summarizeRegions([]).ratio, null)
  assert.notEqual(mapColor(null), mapColor(0))
  assert.equal(summarizeRegions([rows[0]]).denominator, 1)
})
test('시군구 비율 정렬은 원본을 보존하며 동률은 건수·코드로 결정한다', () => {
  const rows = [{region_key:'b',at_cap_ratio:1,denominator:2},{region_key:'a',at_cap_ratio:1,denominator:2},{region_key:'c',at_cap_ratio:1,denominator:9}]
  assert.deepEqual(rankRegions(rows).map(r => r.region_key), ['c','a','b'])
  assert.deepEqual(rows.map(r => r.region_key), ['b','a','c'])
})
