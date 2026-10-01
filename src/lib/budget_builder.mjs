/** Local, multi-course extension of the M5 posted-price pair contract. */
export function buildCourseBudget(catalog, selectedIds) {
  const cap = catalog.cap_krw;
  const valid = r => r.observed_month === catalog.observed_month &&
    (r.cap_krw === undefined || r.cap_krw === cap) &&
    r.date_overlaps_observed_month && Number.isFinite(r.price_krw) && r.price_krw > 0;
  const byId = new Map(catalog.records.map(r => [r.id, r]));
  const selected = [...new Set(selectedIds)].map(id => {
    const row = byId.get(id);
    if (!row || !valid(row)) throw new Error('선택한 강좌가 현재 관측월의 유효한 가격 기록이 아닙니다.');
    return row;
  });
  if (selected.some(r => r.region_key !== selected[0].region_key)) throw new Error('같은 시군구의 강좌만 조합할 수 있습니다.');
  const total = selected.reduce((sum,r) => sum + r.price_krw, 0);
  const remaining = Math.max(0, cap - total);
  const ids = new Set(selectedIds);
  const candidates = selected.length && remaining > 0 ? catalog.records
    .filter(r => valid(r) && !ids.has(r.id) && r.region_key === selected[0].region_key && r.price_krw <= remaining)
    .map(r => ({...r, combined_price_krw:total+r.price_krw, remaining_cap_after_add_krw:remaining-r.price_krw}))
    .sort((a,b) => a.price_krw-b.price_krw || String(a.course_name ?? '').localeCompare(String(b.course_name ?? ''),'ko') || a.id.localeCompare(b.id)) : [];
  return {selected, total_price_krw:total, remaining_cap_krw:remaining, over_cap_krw:Math.max(0,total-cap), candidates};
}
