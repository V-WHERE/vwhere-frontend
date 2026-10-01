import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {buildCourseBudget} from '../src/lib/budget_builder.mjs'
import {findCompanions} from '../src/lib/m5_logic.mjs'
const row=(id,price,extra={})=>({id,price_krw:price,observed_month:'202607',region_key:'a',date_overlaps_observed_month:true,...extra})
const catalog={observed_month:'202607',cap_krw:110000,records:[row('a',20000),row('b',5000),row('c',40000),row('d',45000),row('e',45001),row('same-region-only',1,{region_key:'b'}),row('wrong-month',1,{observed_month:'202606'}),row('expired',1,{date_overlaps_observed_month:false}),row('zero',0),row('wrong-cap',1,{cap_krw:80000}),row('full',110000),row('over',130000)]}
test('세 번째·네 번째 강좌도 누적 합계로 한도 경계까지 추가하며 선택 ID는 제외한다',()=>{
 const a=buildCourseBudget(catalog,['a','b']);assert.equal(a.total_price_krw,25000);assert.equal(a.remaining_cap_krw,85000)
 assert.deepEqual(a.candidates.map(c=>c.id),['c','d','e'])
 const b=buildCourseBudget(catalog,['a','b','c']);assert.equal(b.remaining_cap_krw,45000);assert.deepEqual(b.candidates.map(c=>c.id),['d'])
 const c=buildCourseBudget(catalog,['a','b','c','d']);assert.equal(c.total_price_krw,110000);assert.equal(c.remaining_cap_krw,0);assert.deepEqual(c.candidates,[])
})
test('강좌를 제거하면 잔여 한도와 후보가 복구되며 중복 ID는 중복 합산하지 않는다',()=>{
 const b=buildCourseBudget(catalog,['a','c','a']);assert.equal(b.total_price_krw,60000);assert.ok(b.candidates.some(c=>c.id==='b'));assert.equal(b.selected.length,2)
})
test('한도와 같은·초과 강좌도 선택 정보와 가격은 유지하고 후보는 비운다',()=>{
 for(const id of ['full','over']){const b=buildCourseBudget(catalog,[id]);assert.equal(b.selected[0].id,id);assert.equal(b.remaining_cap_krw,0);assert.equal(b.candidates.length,0)}
 assert.equal(buildCourseBudget(catalog,['over']).over_cap_krw,20000)
})
test('다른 월·지역·유효하지 않은 기록을 선택 집합에 섞지 않는다',()=>{
 for(const ids of [['wrong-month'],['expired'],['zero'],['wrong-cap'],['missing'],['a','same-region-only']]) assert.throws(()=>buildCourseBudget(catalog,ids))
 assert.equal(buildCourseBudget(catalog,[]).candidates.length,0)
})
test('실제 7월 카탈로그의 첫 선택 후보는 기존 M5 두 강좌 계약과 일치한다',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../public/data/catalog/202607.json',import.meta.url)))
 const before=JSON.stringify(data)
 for(const r of data.records.filter(r=>r.date_overlaps_observed_month&&r.price_krw>0&&r.price_krw<data.cap_krw)){
  const a=buildCourseBudget(data,[r.id]);const b=findCompanions(data,r.id,{limit:10000})
  assert.deepEqual(a.candidates.map(c=>[c.id,c.combined_price_krw,c.remaining_cap_after_add_krw]),b.candidates.map(c=>[c.id,c.combined_price_krw,c.remaining_cap_after_pair_krw]))
 }
 assert.equal(JSON.stringify(data),before)
})
