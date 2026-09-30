/** M5 frontend-neutral logic. The returned values are posted-price candidates. */

export function findCompanions(catalog, selectedId, options = {}) {
  const { regionScope = 'same', sportKey = 'ALL', limit = 50 } = options;
  if (!['same', 'all'].includes(regionScope)) throw new Error('Invalid regionScope');
  if (!Number.isInteger(limit) || limit < 1) throw new Error('Invalid limit');
  const selected = catalog.records.find((record) => record.id === selectedId);
  if (!selected) throw new Error('Selected course not found in this observed month');
  const cap = catalog.cap_krw;
  if (selected.observed_month !== catalog.observed_month ||
      (selected.cap_krw !== undefined && selected.cap_krw !== cap) ||
      !selected.date_overlaps_observed_month ||
      selected.price_krw <= 0 || selected.price_krw >= cap) {
    return { selected, cap_krw: cap, planning_headroom_krw: Math.max(cap - selected.price_krw, 0),
      total_candidates: 0, candidates: [], reason: 'selected_course_not_eligible_for_price_pair' };
  }

  const planningHeadroom = cap - selected.price_krw;
  const matches = catalog.records
    .filter((candidate) => candidate.id !== selected.id &&
      candidate.observed_month === selected.observed_month &&
      (candidate.cap_krw === undefined || candidate.cap_krw === cap) &&
      candidate.date_overlaps_observed_month &&
      candidate.price_krw > 0 && candidate.price_krw <= planningHeadroom &&
      (regionScope === 'all' || candidate.region_key === selected.region_key) &&
      (sportKey === 'ALL' || candidate.sport_key === sportKey))
    .map((candidate) => ({ ...candidate,
      combined_price_krw: selected.price_krw + candidate.price_krw,
      remaining_cap_after_pair_krw: cap - selected.price_krw - candidate.price_krw }))
    .sort((a, b) => a.price_krw - b.price_krw ||
      String(a.course_name || '').localeCompare(String(b.course_name || ''), 'ko') ||
      a.id.localeCompare(b.id));
  return { selected, cap_krw: cap, planning_headroom_krw: planningHeadroom,
    total_candidates: matches.length, candidates: matches.slice(0, limit),
    reason: matches.length ? null : 'no_price_pair_in_scope' };
}

export function simulateFromBins(binDocument, targetCap, options = {}) {
  const { regionKey = 'ALL', sportKey = 'ALL' } = options;
  const baseCap = binDocument.base_cap_krw;
  if (!Number.isInteger(targetCap) || targetCap < baseCap) {
    throw new Error('targetCap must be an integer >= baseCap');
  }
  const group = binDocument.groups.find((g) => g.region_key === regionKey && g.sport_key === sportKey);
  if (!group) return { status: 'no_records', region_key: regionKey, sport_key: sportKey };
  const baselineEligible = group.price_bins.reduce((sum, [price, n]) => sum + (price <= baseCap ? n : 0), 0);
  const delta = targetCap - baseCap;
  const scenarios = [
    ['freeze', 0], ['half', Math.ceil(delta / 2)], ['full', delta],
  ].map(([key, increase]) => {
    let eligible = 0, newlyEligible = 0, atNewCap = 0;
    for (const [price, count] of group.price_bins) {
      const changed = price + increase;
      if (changed <= targetCap) eligible += count;
      if (price > baseCap && changed <= targetCap) newlyEligible += count;
      if (changed === targetCap) atNewCap += count;
    }
    return { key, assumed_price_increase_krw: increase,
      eligible_count: eligible, newly_eligible_count: newlyEligible,
      at_new_cap_count: atNewCap, compared_records: group.denominator };
  });
  return { status: 'ok', period: binDocument.period, unit: binDocument.unit,
    region_key: regionKey, sport_key: sportKey, base_cap_krw: baseCap,
    target_cap_krw: targetCap, compared_records: group.denominator,
    baseline_eligible_count: baselineEligible, scenarios,
    interpretation: '가격 변동 가정별 산술 결과이며 미래 가격이나 실제 결제액의 예측이 아닙니다.' };
}
