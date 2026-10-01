import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync, readdirSync} from 'node:fs'
import {buildCourseBudget} from '../src/lib/budget_builder.mjs'
import {simulateFromBins} from '../src/lib/m5_logic.mjs'
import {discoverCourses, partnerIds, readSelection, restoreIds, regionLabel, provinceNames, provinceBins, selectionText, simulationSummary, validCourses} from '../src/lib/discovery.mjs'
const read = path => JSON.parse(readFileSync(new URL(`../public/data/${path}`,import.meta.url)))
const catalog = read('catalog/202607.json'), lookups = read('lookups.json')
const base = {observed_month:'202607',cap_krw:110000,records:[]}
const row = (id,price,region='11-11110',extra={}) => ({id,price_krw:price,region_key:region,observed_month:'202607',date_overlaps_observed_month:true,course_name:id,facility_name:'테스트 시설',sport_name:'수영',sport_key:'s',...extra})

test('indexed partner filter exactly matches same-month/same-region pair eligibility in every published catalog',()=>{
 for(const file of readdirSync(new URL('../public/data/catalog/',import.meta.url)).filter(f=>f.endsWith('.json'))) {
  const cat=read(`catalog/${file}`), rows=validCourses(cat)
  const expected=rows.filter(r=>rows.some(other=>other.id!==r.id && other.region_key===r.region_key && r.price_krw+other.price_krw<=cat.cap_krw)).map(r=>r.id).sort()
  assert.deepEqual([...partnerIds(cat)].sort(),expected,file)
 }
})
test('filters compose search, province, district, sport, strict below-cap and stable price sorting',()=>{
 const rows=discoverCourses(catalog,{query:'종로장애인복지관',province:'11',region:'11-11110',belowOnly:true,sort:'price'})
 assert.ok(rows.length>2)
 assert.ok(rows.every(r=>r.facility_name.includes('종로장애인복지관')&&r.price_krw<110000&&r.region_key==='11-11110'))
 assert.ok(rows.every((r,i)=>!i||rows[i-1].price_krw<=r.price_krw))
 assert.equal(discoverCourses(catalog,{query:'없는강좌__',province:'11'}).length,0)
 assert.equal(discoverCourses(catalog,{province:'26',region:'11-11110'}).length,0)
})
test('cap equality, above-cap info, invalid month/price, singleton and different-region do not gain partners',()=>{
 const c={...base,records:[row('a',55000),row('b',55000),row('equal',110000),row('over',120000),row('zero',0),row('wrong',100,'11-11110',{observed_month:'202608'}),row('solo',100,'26-26110')]}
 assert.deepEqual([...partnerIds(c)].sort(),['a','b'])
 assert.ok(discoverCourses(c).some(r=>r.id==='over'))
 assert.ok(!discoverCourses(c,{belowOnly:true}).some(r=>r.id==='equal'))
})
test('stored selections reject malformed/blocked storage and unsupported versions',()=>{
 for(const value of ['x','null','{}','{"version":2,"month":"202607","ids":[]}','{"version":1,"month":"202607","ids":[9]}']) assert.equal(readSelection({getItem:()=>value}),null)
 assert.equal(readSelection({getItem:()=>{throw Error('denied')}}),null)
 assert.deepEqual(readSelection({getItem:()=>JSON.stringify({version:1,month:'202607',ids:['a']})}),{month:'202607',ids:['a'],region:'ALL',sport:'ALL'})
})
test('restore drops unavailable/duplicate/cross-region/over-budget additions but allows above-cap first information',()=>{
 const c={...base,records:[row('a',60000),row('b',30000),row('c',25000),row('x',100,'26-26110'),row('over',120000)]}
 assert.deepEqual(restoreIds(c,['missing','a','a','x','b','c']),['a','b'])
 assert.deepEqual(restoreIds(c,['over','b']),['over'])
 assert.doesNotThrow(()=>buildCourseBudget(c,restoreIds(c,['a','x','b','c'])))
})
test('13 missing names resolve to city names supported by source catalog without changing region keys',()=>{
 const missing=lookups.regions.filter(r=>!r.region_name)
 assert.equal(missing.length,13)
 for(const r of missing) {
  const city=regionLabel(r.region_key,lookups.regions,false)
  assert.ok(!city.includes('미제공'))
  const records=catalog.records.filter(c=>c.region_key===r.region_key)
  assert.ok(records.length)
  assert.ok(records.every(c=>c.facility_address.includes(city)),city)
 }
 assert.notEqual(regionLabel('11-11140',lookups.regions),regionLabel('26-26110',lookups.regions))
})
test('province scenarios equal district scenario sums for every period/unit/province in overall and swimming scopes, with no double counting',()=>{
 for(const file of readdirSync(new URL('../public/data/sim_bins/',import.meta.url)).filter(f=>f.endsWith('.json'))) {
  const bins=read(`sim_bins/${file}`)
  for(const province of Object.keys(provinceNames)) for(const sport of ['ALL','name:수영']) {
   const scoped=provinceBins(bins,province,sport), districts=bins.groups.filter(g=>g.region_key.startsWith(`${province}-`)&&g.sport_key===sport)
   const result=simulateFromBins(scoped,120000,{sportKey:sport})
   if(!districts.length){assert.equal(result.status,'no_records');continue}
   assert.equal(result.compared_records,districts.reduce((n,g)=>n+g.denominator,0))
   for(const scenario of result.scenarios) for(const field of ['eligible_count','newly_eligible_count','at_new_cap_count']) {
    const sum=districts.reduce((n,g)=>n+simulateFromBins(bins,120000,{regionKey:g.region_key,sportKey:sport}).scenarios.find(s=>s.key===scenario.key)[field],0)
    assert.equal(scenario[field],sum,`${file}/${province}/${sport}/${scenario.key}/${field}`)
   }
  }
  assert.equal(provinceBins(bins,'ALL','ALL'),bins)
 }
})
test('sharing contains observed month, public names and price totals, not personal fields or application assertions',()=>{
 const rows=discoverCourses(catalog,{region:'11-11110',sort:'price'}).slice(0,2)
 const text=selectionText(catalog,rows.map(r=>r.id),lookups.regions)
 assert.ok(text.includes('2026년 7월'))
 assert.ok(text.includes('게시가격'))
 for(const r of rows) {assert.ok(text.includes(r.course_name));assert.ok(!text.includes(r.id))}
 assert.ok(text.endsWith('https://dvoucher.kspo.or.kr/main.do'))
 assert.equal(selectionText(catalog,[],lookups.regions),'')
})
test('simulation summary is derived from scope and results, including monthly-record unit',()=>{
 const sim=simulateFromBins(read('sim_bins/2026_unique_course.json'),120000)
 assert.ok(simulationSummary(sim,'2026년 · 전국 · 전체 종목','unique_course').includes(`${sim.scenarios[0].eligible_count.toLocaleString('ko-KR')}개`))
 assert.ok(simulationSummary(sim,'서울 · 수영','monthly_record').includes('월별 기록은'))
 assert.equal(simulationSummary({status:'no_records'},'전국','unique_course'),'')
})
