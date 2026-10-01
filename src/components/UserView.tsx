import { useMemo, useState } from "react";
import { buildCourseBudget } from "../lib/budget_builder.mjs";
import type { CourseBudget } from "../lib/budget_builder.mjs";
import { compareNullableKo } from "../lib/sort.mjs";
import type { Catalog, Lookups, Meta } from "../types";
import { Runner, SectionTitle } from "./Brand";
const won = (n: number) => `${n.toLocaleString("ko-KR")}원`,
  date = (s: string) => `${s.slice(4, 6)}.${s.slice(6)}`,
  applyUrl = "https://dvoucher.kspo.or.kr/main.do";
type Props = {
  meta: Meta;
  catalog: Catalog;
  lookups: Lookups;
  month: string;
  setMonth: (v: string) => void;
  region: string;
  setRegion: (v: string) => void;
  sport: string;
  setSport: (v: string) => void;
  latestReview: boolean;
};
export function UserView({
  meta,
  catalog,
  lookups,
  month,
  setMonth,
  region,
  setRegion,
  sport,
  setSport,
  latestReview,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [candidateSport, setCandidateSport] = useState("ALL");
  const [visible, setVisible] = useState(8);
  const eligible = useMemo(() => catalog.records.filter(r =>
    r.observed_month === catalog.observed_month && r.date_overlaps_observed_month &&
    (r.cap_krw === undefined || r.cap_krw === catalog.cap_krw) &&
    Number.isFinite(r.price_krw) && r.price_krw > 0 && (region === "ALL" || r.region_key === region) &&
    (sport === "ALL" || r.sport_key === sport)), [catalog, region, sport]);
  const budget = useMemo(() => buildCourseBudget(catalog, selectedIds), [catalog, selectedIds]);
  const selected = budget.selected[0];
  const filteredCandidates = budget.candidates.filter(r => candidateSport === "ALL" || r.sport_key === candidateSport);
  const candidates = filteredCandidates.slice(0, visible);
  const counts = budget.candidates.reduce<Record<string, number>>((a,r) => {
    a[r.sport_key] = (a[r.sport_key] ?? 0) + 1; return a;
  }, {});
  const addCourse = (id:string) => {
    setSelectedIds(ids => buildCourseBudget(catalog, ids).candidates.some(r => r.id === id) ? [...ids, id] : ids);
    setCandidateSport("ALL"); setVisible(8);
  };
  const removeCourse = (id:string) => {
    setSelectedIds(ids => ids.filter(value => value !== id));
    setCandidateSport("ALL"); setVisible(8);
  };
  const mm = meta.available_catalog_months.find((m) => m.month === month)!;
  const ratio = mm.under_cap_date_overlapping_records
    ? mm.selected_courses_with_same_region_price_partner /
      mm.under_cap_date_overlapping_records
    : 0;
  const lookupRegionNames = new Map(
    lookups.regions.map((r) => [r.region_key, r.region_name]),
  );
  const regions = [
    ...new Map(
      catalog.records.map((r) => [
        r.region_key,
        r.region_name ?? lookupRegionNames.get(r.region_key),
      ]),
    ).entries(),
  ].sort((a, b) => compareNullableKo(a[1], b[1]));
  const change = (setter: (v: string) => void, value: string) => {
    setSelectedIds([]); setCandidateSport("ALL"); setVisible(8); setter(value);
  };
  return (
    <>
      <section className="hero" id="top">
        <div className="wrap hero-grid">
          <div>
            <h1>
              한 달 한도 안에서,
              <br />두 번째 운동까지
            </h1>
            <p className="hero-copy">
              강좌를 고르고, 남은 한도 안에서 다음 운동을 더해 보세요.
              같은 시군구의 게시가격을 합산해 함께 볼 수 있는 강좌를 찾아 드려요.
            </p>
            <div className="hero-stats">
              <div>
                <strong>{(ratio * 100).toFixed(1)}%</strong>
                <span>
                  추가 후보가 있는
                  <br />
                  한도 미만 강좌 (
                  {mm.selected_courses_with_same_region_price_partner.toLocaleString()}
                  /{mm.under_cap_date_overlapping_records.toLocaleString()})
                </span>
              </div>
              <div>
                <strong>
                  {mm.regions_with_price_partner}
                  <small>곳</small>
                </strong>
                <span>
                  후보가 관측된
                  <br />
                  시군구
                </span>
              </div>
              <div>
                <strong>
                  {catalog.cap_krw.toLocaleString()}
                  <small>원</small>
                </strong>
                <span>월 한도</span>
              </div>
            </div>
          </div>
          <Runner />
        </div>
      </section>
      <section className="filters wrap">
        <SectionTitle>관측월 선택</SectionTitle>
        <div className="month-tabs" role="tablist" aria-label="자료월">
          {meta.available_catalog_months.map((m) => (
            <button
              role="tab"
              aria-selected={month === m.month}
              key={m.month}
              onClick={() => change(setMonth, m.month)}
            >
              {m.month.slice(0, 4)}. {Number(m.month.slice(4))}월
            </button>
          ))}
        </div>
        <div className="filter-row">
          <label>
            지역
            <select
              value={region}
              onChange={(e) => change(setRegion, e.target.value)}
            >
              <option value="ALL">전체 지역</option>
              {regions.map(([k, n]) => (
                <option key={k} value={k}>
                  {n ?? `지역명 미제공 (${k})`}
                </option>
              ))}
            </select>
          </label>
          <label>
            첫 강좌 종목
            <select
              value={sport}
              onChange={(e) => change(setSport, e.target.value)}
            >
              <option value="ALL">전체 종목</option>
              {lookups.sports.map((s) => (
                <option key={s.sport_key} value={s.sport_key}>
                  {s.sport_name}
                </option>
              ))}
            </select>
          </label>
          <span>
            {month.slice(0, 4)}년 {Number(month.slice(4))}월 가격 기록{" "}
            {catalog.records.length.toLocaleString()}건
          </span>
        </div>
        {latestReview && (
          <div className="review" role="status">
            <b>8월 · 자료량 검토</b>
            <span>
              {mm.priced_records.toLocaleString()}건 (7월{" "}
              {meta.available_catalog_months
                .find((m) => m.month === "202607")
                ?.priced_records.toLocaleString()}
              건) · {meta.latest_month_note}
            </span>
            <button onClick={() => change(setMonth, "202607")}>
              7월 자료로 보기
            </button>
          </div>
        )}
      </section>
      <section className="results">
        <div className="wrap result-grid">
          <div>
            <SectionTitle
              aside={`한도 미만 ${eligible.filter((r) => r.price_krw < catalog.cap_krw).length.toLocaleString()}건`}
            >
              첫 강좌 선택
            </SectionTitle>
            <div
              className={eligible.length ? "course-list" : "course-list empty-list"}
              aria-label="첫 강좌 목록"
            >
              {eligible.length ? (
                eligible.map((r) => (
                  <button
                    aria-pressed={selectedIds[0] === r.id}
                    className={selectedIds[0] === r.id ? "course active" : "course"}
                    key={r.id}
                    onClick={() => {
                      setSelectedIds([r.id]);
                      setCandidateSport("ALL");
                      setVisible(8);
                    }}
                  >
                    <span>
                      <b>■ {r.sport_name}</b>
                      <strong>{won(r.price_krw)}</strong>
                    </span>
                    <em>{r.course_name}</em>
                    <small>
                      {r.facility_name} · {date(r.course_begin_date)} -{" "}
                      {date(r.course_end_date)}
                    </small>
                    <small>
                      {r.price_krw > catalog.cap_krw ? `한도 초과 ${won(r.price_krw - catalog.cap_krw)}` : `남는 한도 ${won(catalog.cap_krw - r.price_krw)}`}
                    </small>
                  </button>
                ))
              ) : (
                <Empty kind="first" />
              )}
            </div>
          </div>
          <div>
            <SectionTitle>선택한 강좌와 추가 조합</SectionTitle>
            {!selected ? <div className="empty result-empty"><b>첫 강좌를 선택해 주세요</b><p>선택한 강좌의 가격과 남는 한도를 확인하고, 다음 강좌를 추가할 수 있습니다.</p></div> : <>
              <BudgetCard cap={catalog.cap_krw} budget={budget} onRemove={removeCourse} onReset={() => setSelectedIds([])} />
              <div className="next-course-heading"><h3>남은 한도로 추가할 강좌</h3><span>{budget.candidates.length.toLocaleString()}건</span></div>
              <p className="budget-note">같은 시군구 · {month.slice(0,4)}년 {Number(month.slice(4))}월 게시가격 기준. 추가하면 남은 한도를 다시 계산합니다.</p>
              {budget.candidates.length > 0 ? <>
                <div className="candidate-tabs">
                  <button className={candidateSport === "ALL" ? "active" : ""} onClick={() => {setCandidateSport("ALL");setVisible(8)}}>전체 {budget.candidates.length}</button>
                  {lookups.sports.filter(s => counts[s.sport_key]).map(s => <button key={s.sport_key} className={candidateSport === s.sport_key ? "active" : ""} onClick={() => {setCandidateSport(s.sport_key);setVisible(8)}}>{s.sport_name} {counts[s.sport_key]}</button>)}
                </div>
                <div className="candidate-table budget-candidates"><table>
                  <caption className="sr-only">현재 선택에 추가할 수 있는 강좌와 추가 후 가격 합계 및 남는 한도</caption>
                  <thead><tr><th scope="col">종목</th><th scope="col">강좌 · 시설</th><th scope="col">강좌 가격</th><th scope="col">추가 후 금액</th><th scope="col">선택</th></tr></thead>
                  <tbody>{candidates.map(c => <tr key={c.id}>
                    <td>{c.sport_name}</td><td><b>{c.course_name}</b><small>{c.facility_name}<br/>{date(c.course_begin_date)} - {date(c.course_end_date)}</small></td>
                    <td>{won(c.price_krw)}</td>
                    <td><div className="amount-line"><span>합계</span><strong>{won(c.combined_price_krw)}</strong></div><div className="amount-line remaining"><span>남는 한도</span><strong>{won(c.remaining_cap_after_add_krw)}</strong></div></td>
                    <td><button onClick={() => addCourse(c.id)} aria-label={`${c.course_name} 추가`}>＋ 추가</button></td>
                  </tr>)}</tbody></table></div>
                {visible < filteredCandidates.length && <button className="more" onClick={() => setVisible(v => v+8)}>더보기 ({filteredCandidates.length-visible}건) ＋</button>}
              </> : <div className="empty budget-empty">
                <b>{budget.over_cap_krw > 0 ? "선택한 강좌 가격이 월 한도를 초과합니다" : budget.remaining_cap_krw === 0 ? "선택한 강좌로 월 한도를 모두 채웠습니다" : "남은 한도에 맞는 추가 강좌가 없습니다"}</b>
                <p>{budget.over_cap_krw > 0 ? "강좌 정보를 확인하거나 다른 첫 강좌를 선택해 보세요." : "선택한 강좌는 위에서 확인할 수 있습니다. 강좌를 빼거나 다른 첫 강좌를 선택해 보세요."}</p>
              </div>}
            </>}

          </div>
        </div>
      </section>
      <section className="apply wrap">
        <div>
          <b>■ 모집 여부·수업시간·최종 가격은 신청 사이트에서 확인하세요.</b>
          <p>
            이 화면은 게시가격 기준의 가격 조합 후보이며, 개인 잔액이나 실제
            결제를 반영하지 않습니다.
          </p>
        </div>
        <a className="primary" href={applyUrl} target="_blank" rel="noreferrer">
          공식 신청 사이트 바로가기
        </a>
      </section>
    </>
  );
}
function Empty({ kind = "companion" }: { kind?: "first" | "companion" }) {
  if (kind === "first") {
    return (
      <div className="empty result-empty">
        <b>조건에 맞는 첫 강좌가 없습니다</b>
        <p>지역·종목·자료월을 바꿔보세요.</p>
      </div>
    );
  }
  return (
    <div className="empty result-empty">
      <b>선택한 월·지역에서 가격이 맞는 추가 강좌가 없습니다</b>
      <p>다른 첫 강좌나 관측월을 선택해 보세요.</p>
    </div>
  );
}
function BudgetCard({cap, budget, onRemove, onReset}: {cap:number;budget:CourseBudget;onRemove:(id:string)=>void;onReset:()=>void}) {
  return <div className="pair-card budget-card">
    <div className="budget-card-heading"><b>선택한 강좌 {budget.selected.length}개</b><button onClick={onReset}>선택 초기화</button></div>
    <div className="pair-totals" role="status" aria-live="polite">
      <span>선택한 강좌 가격 합계<strong>{won(budget.total_price_krw)}</strong></span>
      <span>{budget.over_cap_krw > 0 ? "월 한도 초과액" : "추가로 쓸 수 있는 한도"}<strong>{won(budget.over_cap_krw || budget.remaining_cap_krw)}</strong></span>
    </div>
    <div className="price-bar" aria-hidden="true"><i style={{width:`${Math.min(100,budget.total_price_krw/cap*100)}%`}} /></div>
    <small>게시가격 합계 기준<span>월 한도 {won(cap)}</span></small>
    <ol className="selected-courses">{budget.selected.map((r,i) => <li key={r.id}>
      <span className="selection-number">{i+1}</span><div><b>{r.course_name}</b><small>{r.facility_name} · {r.sport_name}</small><small>{date(r.course_begin_date)} - {date(r.course_end_date)}</small></div>
      <strong>{won(r.price_krw)}</strong>{i>0 && <button aria-label={`${r.course_name} 빼기`} onClick={() => onRemove(r.id)}>빼기</button>}
    </li>)}</ol>
    <a className="selected-apply" href={applyUrl} target="_blank" rel="noreferrer">공식 사이트에서 신청 정보 확인 ↗</a>
  </div>;
}
