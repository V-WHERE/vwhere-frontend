import { useMemo, useState } from "react";
import { buildCourseBudget } from "../lib/budget_builder.mjs";
import type { CourseBudget } from "../lib/budget_builder.mjs";
import { discoverCourses, partnerIds, regionLabel, selectionText, provinceOf } from "../lib/discovery.mjs";
import { RegionFilter } from "./RegionFilter";
import { CombinationShareCard } from "./CombinationShareCard";
import type { Dispatch, SetStateAction } from "react";
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
  province:string; setProvince:(v:string)=>void;
  selectedIds:string[]; setSelectedIds:Dispatch<SetStateAction<string[]>>;
  storageAvailable:boolean; selectionNotice:string;
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
  latestReview, province, setProvince, selectedIds, setSelectedIds, storageAvailable, selectionNotice,
}: Props) {
  const [candidateSport, setCandidateSport] = useState("ALL");
  const [visible, setVisible] = useState(8);
  const [listVisible, setListVisible] = useState(20);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");
  const [belowOnly, setBelowOnly] = useState(false);
  const [partnersOnly, setPartnersOnly] = useState(false);
  const [copyNotice, setCopyNotice] = useState("");
  const [copyFallback, setCopyFallback] = useState("");
  const partners = useMemo(() => partnerIds(catalog), [catalog]);
  const activeProvince = region === "ALL" ? province : provinceOf(region);
  const eligible = useMemo(() => discoverCourses(catalog, {region,province:activeProvince,sport,query,sort,belowOnly,partnersOnly},partners), [catalog,region,activeProvince,sport,query,sort,belowOnly,partnersOnly,partners]);
  const regions = useMemo(() => lookups.regions.filter(r => catalog.records.some(c => c.region_key === r.region_key) || r.region_key === region), [catalog,lookups,region]);
  const resetList = () => setListVisible(20);
  const copy = async (text:string, label:string) => {
    try { await navigator.clipboard.writeText(text); setCopyFallback(""); setCopyNotice(`${label} 복사했습니다.`) }
    catch { setCopyFallback(text); setCopyNotice("자동 복사를 사용할 수 없습니다. 아래 내용을 선택해 복사해 주세요.") }
  };
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
  const change = (setter: (v: string) => void, value: string) => {
    setCandidateSport("ALL"); setVisible(8); resetList(); setter(value);
  };
  const clearFilters = () => {setRegion("ALL");setProvince("ALL");setSport("ALL");setQuery("");setBelowOnly(false);setPartnersOnly(false);setSort("name");resetList()};
  return (
    <>
      <section className="hero">
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
            <form className="hero-search" onSubmit={e => {e.preventDefault();document.getElementById('course-results')?.scrollIntoView({behavior:'smooth'})}}>
              <label htmlFor="course-search">어떤 운동을 찾으세요?</label>
              <div><input id="course-search" type="search" value={query} placeholder="강좌명 또는 시설명 검색" onChange={e => {setQuery(e.target.value);resetList()}}/><button className="primary" type="submit">강좌 찾기</button></div>
            </form>
            <a className="hero-location-link" href="#course-filters">지역·종목으로 찾아보기 ↓</a>

          </div>
          <Runner />
        </div>
      </section>
      <section className="filters wrap" id="course-filters">
        <SectionTitle>지역과 강좌 조건 선택</SectionTitle>
        <p className="observation-note">가격 자료: {month.slice(0,4)}년 {Number(month.slice(4))}월 · 월 한도 {won(catalog.cap_krw)} · 신청 가능 여부는 공식 사이트에서 확인</p>
        <label className="mobile-month-picker">가격 자료월<select value={month} onChange={e => change(setMonth,e.target.value)}>{meta.available_catalog_months.map(m => <option key={m.month} value={m.month}>{m.month.slice(0,4)}년 {Number(m.month.slice(4))}월</option>)}</select></label>
        <div className="month-tabs" role="group" aria-label="가격 자료월">
          {meta.available_catalog_months.map((m) => (
            <button
              aria-pressed={month === m.month}
              key={m.month}
              onClick={() => change(setMonth, m.month)}
            >
              {m.month.slice(0, 4)}. {Number(m.month.slice(4))}월
            </button>
          ))}
        </div>
        <div className="filter-row">
          <RegionFilter regions={regions} province={activeProvince} region={region}
            onProvince={v => {setProvince(v);change(setRegion,"ALL")}} onRegion={v => {if(v !== "ALL") setProvince(provinceOf(v));change(setRegion,v)}} />
          <label>
            종목
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
        <div className="discovery-options">
          <label>정렬<select value={sort} onChange={e => {setSort(e.target.value);resetList()}}><option value="name">강좌 이름순</option><option value="price">낮은 가격순</option></select></label>
          <label className="check-filter"><input type="checkbox" checked={belowOnly} onChange={e => {setBelowOnly(e.target.checked);resetList()}}/>한도 미만만</label>
          <label className="check-filter"><input type="checkbox" checked={partnersOnly} onChange={e => {setPartnersOnly(e.target.checked);resetList()}}/>추가 조합 후보 있는 강좌만</label>
          <button className="filter-reset" onClick={clearFilters}>검색 조건 초기화</button>
        </div>
        <details className="national-context"><summary>전국 자료 요약 · {month.slice(0,4)}년 {Number(month.slice(4))}월 · 전체 종목</summary>
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
            </div>        </details>
        {selectionNotice && <p className="observation-note" role="status">{selectionNotice}</p>}
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
      <section className="results" id="course-results">
        <div className="wrap result-grid">
          <div>
            <SectionTitle
              aside={`검색 결과 ${eligible.length.toLocaleString()}건`}
            >
              첫 강좌 선택
            </SectionTitle>
            <div
              className={eligible.length ? "course-list" : "course-list empty-list"}
              aria-label="첫 강좌 목록"
            >
              {eligible.length ? (
                eligible.slice(0,listVisible).map((r) => (
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
                    <small>{regionLabel(r.region_key,lookups.regions)} · {partners.has(r.id) ? "추가 조합 후보 있음" : "단일 강좌 정보"}</small>
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
                <div className="empty result-empty"><b>조건에 맞는 강좌가 없습니다</b><p>검색어·지역·가격 조건을 바꿔보세요.</p><button className="filter-reset" onClick={clearFilters}>검색 조건 초기화</button></div>
              )}
            </div>
            <p className="list-count" role="status">{eligible.length.toLocaleString()}건 중 {Math.min(listVisible,eligible.length).toLocaleString()}건 표시 · {month.slice(0,4)}년 {Number(month.slice(4))}월 가격</p>
            {listVisible < eligible.length && <button className="more" onClick={() => setListVisible(v => v+20)}>강좌 20개 더 보기 ({(eligible.length-listVisible).toLocaleString()}건 남음)</button>}
          </div>
          <div id="course-selection">
            <SectionTitle>선택한 강좌와 추가 조합</SectionTitle>
            <p className="selection-storage">{storageAvailable ? "선택한 조합은 이 기기에 자동 저장됩니다. 화면을 전환하거나 새로고침해도 이어서 볼 수 있어요." : "브라우저 저장 공간을 사용할 수 없습니다. 새로고침 전에 조합을 복사해 주세요."}</p>
            {!selected ? <div className="empty result-empty"><b>첫 강좌를 선택해 주세요</b><p>선택한 강좌의 가격과 남는 한도를 확인하고, 다음 강좌를 추가할 수 있습니다.</p></div> : <>
              <BudgetCard month={month} onCopyFacility={name => void copy(name,"시설명을")} cap={catalog.cap_krw} budget={budget} onRemove={removeCourse} onReset={() => {setSelectedIds([]);setCopyFallback("");setCopyNotice("")}} />
              {copyNotice && <p role="status" className="copy-notice">{copyNotice}</p>}
              {copyFallback && <label className="copy-fallback">복사할 시설명<textarea readOnly value={copyFallback} onFocus={e => e.target.select()}/></label>}
              <CombinationShareCard text={selectionText(catalog,selectedIds,lookups.regions)} />

              <div className="next-course-heading"><h3>남은 한도로 추가할 강좌</h3><span>{budget.candidates.length.toLocaleString()}건</span></div>
              <p className="budget-note">{regionLabel(selected.region_key,lookups.regions)} · {month.slice(0,4)}년 {Number(month.slice(4))}월 게시가격 기준. 추가하면 남은 한도를 다시 계산합니다.</p>
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
      {selected && <a className="mobile-selection-shortcut" href="#course-selection"><span>선택 {budget.selected.length}개 · 합계 {won(budget.total_price_krw)}</span><b>내 조합 보기 ↑</b></a>}
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
function BudgetCard({cap, budget, onRemove, onReset, month, onCopyFacility}: {cap:number;budget:CourseBudget;onRemove:(id:string)=>void;onReset:()=>void;month:string;onCopyFacility:(name:string)=>void}) {
  return <div className="pair-card budget-card">
    <div className="budget-card-heading"><b>선택한 강좌 {budget.selected.length}개</b><button onClick={onReset}>선택 초기화</button></div>
    <div className="pair-totals" role="status" aria-live="polite">
      <span>선택한 강좌 가격 합계<strong>{won(budget.total_price_krw)}</strong></span>
      <span>{budget.over_cap_krw > 0 ? "월 한도 초과액" : "추가로 쓸 수 있는 한도"}<strong>{won(budget.over_cap_krw || budget.remaining_cap_krw)}</strong></span>
    </div>
    <div className="price-bar" aria-hidden="true"><i style={{width:`${Math.min(100,budget.total_price_krw/cap*100)}%`}} /></div>
    <small>{month.slice(0,4)}년 {Number(month.slice(4))}월 게시가격 기준<span>월 한도 {won(cap)}</span></small>
    <ol className="selected-courses">{budget.selected.map((r,i) => <li key={r.id}>
      <span className="selection-number">{i+1}</span>
      <div className="selected-course-info">
        <b>{r.course_name}</b>
        <small>{r.facility_name}</small>
        <small>{r.sport_name} · {date(r.course_begin_date)} - {date(r.course_end_date)}</small>
      </div>
      <div className="selected-course-actions">
        <strong>{won(r.price_krw)}</strong>
        <div className="selected-course-links">
          <button type="button" className="facility-copy" onClick={() => onCopyFacility(r.facility_name)} aria-label={`${r.facility_name} 시설명 복사`}>시설명 복사</button>
          {i>0 && <button type="button" className="selected-course-remove" aria-label={`${r.course_name} 빼기`} onClick={() => onRemove(r.id)}>빼기</button>}
        </div>
      </div>
    </li>)}</ol>
    <div className="application-guide"><b>공식 사이트에서 이어서 확인하기</b><ol><li>위 강좌의 ‘시설명 복사’를 누르세요.</li><li>공식 사이트의 수강신청 메뉴에서 지역과 시설명을 검색하세요.</li><li>모집 여부·수업시간·최종 가격을 확인하고 신청하세요.</li></ol></div>
    <a className="selected-apply" href={applyUrl} target="_blank" rel="noreferrer">공식 사이트에서 신청 정보 확인 ↗</a>
  </div>;
}
