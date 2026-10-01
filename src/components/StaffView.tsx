import { useState } from "react";
import { simulateFromBins } from "../lib/m5_logic.mjs";
import type {
  BinDocument,
  History,
  Lookups,
  MapDocument,
} from "../types";
import { SectionTitle } from "./Brand";
import { ProvincePriceMap } from "./ProvincePriceMap";
const won = (n: number) => `${n.toLocaleString()}원`;
type Unit = "unique_course" | "monthly_record";
type Props = {
  lookups: Lookups;
  map: MapDocument;
  bins: BinDocument | null;
  history: History;
  period: string;
  setPeriod: (v: string) => void;
  unit: Unit;
  setUnit: (v: Unit) => void;
  mapProvince: string;
  setMapProvince: (v: string) => void;
  region: string;
  setRegion: (v: string) => void;
  sport: string;
  setSport: (v: string) => void;
};
export function StaffView({
  lookups,
  map,
  bins,
  history,
  period,
  setPeriod,
  unit,
  setUnit,
  mapProvince,
  setMapProvince,
  region,
  setRegion,
  sport,
  setSport,
}: Props) {
  const [target, setTarget] = useState(120000);
  const rows = map.records.filter(
    (r) => r.sport_key === sport && r.region_key !== "ALL",
  );
  const national = map.records.find(
      (r) => r.region_key === "ALL" && r.sport_key === sport,
    ),
    sim = bins
      ? simulateFromBins(bins, target, { regionKey: region, sportKey: sport })
      : null,
    years = Object.entries(history.national)
      .filter(([k]) => k.startsWith(`${unit}:`))
      .map(([k, v]) => ({ year: k.split(":")[1], ...v }))
      .sort((a, b) => {
        const order = (value: string) =>
          value === "2024plus" ? 2027 : value === "all_observed" ? 2028 : Number(value);
        return order(a.year) - order(b.year);
      }),
    annualYears = years.filter((item) => /^\d{4}$/.test(item.year)),
    periodSummaries = years.filter((item) => !/^\d{4}$/.test(item.year));
  const itemUnit = unit === "unique_course" ? "개" : "건";
  const itemLabel = unit === "unique_course" ? "강좌 수" : "월별 기록 수";
  return (
    <main className="staff">
      <section className="staff-intro wrap">
        <h1>
          강좌 가격이 월 한도와 같은 비율을
          <br />
          지역·종목별로 봅니다.
        </h1>
        <p>
          지도와 표는 같은 수치를 사용합니다. 한도 변경 가정은 과거 관측과
          분리하여 비교합니다.
        </p>
        <b>
          기준기간 {map.records[0]?.observed_from} -{" "}
          {map.records[0]?.observed_through} | 집계단위{" "}
          {unit === "unique_course" ? "고유 강좌" : "월별 기록"} | 표본{" "}
          {national?.denominator.toLocaleString() ?? "기록 없음"}개 | 시군구{" "}
          {rows.length}곳
        </b>
      </section>
      <section className="wrap staff-controls">
        <div className="period-tabs">
          {["2024", "2025", "2026", "2024plus", "all_observed"].map((p) => (
            <button
              className={period === p ? "active" : ""}
              onClick={() => setPeriod(p)}
              key={p}
            >
              {p === "2024plus"
                ? "2024년 이후"
                : p === "all_observed"
                  ? "전체 관측"
                  : `${p}년`}
            </button>
          ))}
        </div>
        <div className="filter-row">
          <span>집계단위</span>
          <button
            className={unit === "unique_course" ? "active" : ""}
            onClick={() => setUnit("unique_course")}
          >
            고유 강좌
          </button>
          <button
            className={unit === "monthly_record" ? "active" : ""}
            onClick={() => setUnit("monthly_record")}
          >
            월별 기록
          </button>
          <label>
            지역
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="ALL">전체 지역</option>
              {lookups.regions.map((r) => (
                <option key={r.region_key} value={r.region_key}>
                  {r.region_name ?? `지역명 미제공 (${r.region_key})`}
                </option>
              ))}
            </select>
          </label>
          <label>
            종목
            <select value={sport} onChange={(e) => setSport(e.target.value)}>
              <option value="ALL">전체 종목</option>
              {lookups.sports.map((s) => (
                <option key={s.sport_key} value={s.sport_key}>
                  {s.sport_name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="summary-grid">
          <Metric
            label={`전국 한도가(${national?.cap_krw ? won(national.cap_krw) : "혼합 한도"}) 강좌`}
            value={
              national
                ? `${(national.at_cap_ratio * 100).toFixed(1)}%`
                : "기록 없음"
            }
            sub={
              national
                ? `${national.denominator.toLocaleString()}개 중 ${national.at_cap_count.toLocaleString()}개`
                : ""
            }
          />
          <Metric
            label="전국 한도 미만"
            value={national?.below_cap_count.toLocaleString() ?? "—"}
            sub={
              national
                ? `${((national.below_cap_count / national.denominator) * 100).toFixed(1)}%`
                : ""
            }
          />
          <Metric
            label="전국 한도 초과"
            value={national?.over_cap_count.toLocaleString() ?? "—"}
            sub={
              national
                ? `${((national.over_cap_count / national.denominator) * 100).toFixed(1)}%`
                : ""
            }
          />
          <Metric
            label="가격 중앙값"
            value={national ? won(national.price_median_krw) : "—"}
            sub={`전국 ${unit === "unique_course" ? "고유 강좌" : "월별 기록"}`}
          />
        </div>
      </section>
      <section className="wrap map-section" id="map">
        <SectionTitle>한도붙음 지도와 수치</SectionTitle>
        <div className="map-head">
          <span>시도 요약 · 광주·전남은 원천 지역코드상 통합 집계</span>
          <span>
            기간 {period} · 분모{" "}
            {unit === "unique_course" ? "고유 강좌" : "월별 기록"} · 적용 한도{" "}
            {national?.cap_krw ? won(national.cap_krw) : "기간별 한도"}
          </span>
        </div>
        <ProvincePriceMap selectedProvince={mapProvince} setSelectedProvince={setMapProvince} rows={rows} lookups={lookups} unit={unit} region={region} onRegionChange={setRegion} />
      </section>
      <section className="wrap simulator" id="simulation">
        <SectionTitle
          aside={<span className="badge">가정 실험 · 예측 아님</span>}
        >
          한도 변경 시뮬레이션
        </SectionTitle>
        <div className="target-tabs">
          <span>가상 한도</span>
          {[120000, 130000, 140000, 150000].map((n) => (
            <button
              className={target === n ? "active" : ""}
              onClick={() => setTarget(n)}
              key={n}
            >
              {won(n)}
            </button>
          ))}
        </div>
        {bins === null ? (
          <div className="empty">
            <b>전체 관측 기간은 시뮬레이션을 지원하지 않습니다</b>
            <p>2024년, 2025년, 2026년 또는 2024년 이후 기간을 선택해 주세요.</p>
          </div>
        ) : sim?.status === "ok" ? (
          <>
            <p>
              {period}년{" "}
              {region === "ALL"
                ? "전국"
                : (lookups.regions.find((r) => r.region_key === region)
                    ?.region_name ?? region)}{" "}
              {unit === "unique_course" ? "고유 강좌" : "월별 기록"}{" "}
              {sim.compared_records.toLocaleString()}{itemUnit} 기준. 현재 한도{" "}
              {won(sim.base_cap_krw)}에서 한도 내 {unit === "unique_course" ? "강좌는" : "월별 기록은"}{" "}
              {sim.baseline_eligible_count.toLocaleString()}{itemUnit}입니다.
            </p>
            <p className="sim-explanation">
              월 한도를 {won(target)}으로 바꿨을 때, 강좌가격이 어떻게 움직인다고 가정하느냐에 따라 한도 안에 들어오는 {itemLabel}를 비교합니다.
              ‘절반 상승’은 모든 강좌가격에 한도 증가분의 50%를, ‘전액 상승’은 100%를 더한 경우입니다.
              ‘새로 한도 내’는 현재 한도를 초과했지만 변경 후 한도 안에 들어오는 {itemLabel}입니다.
            </p>
            <div className="sim-table" role="region" aria-label="가격 반응 가정별 비교표" tabIndex={0}>
              <div className="sim-head">
                <span><span className="sim-heading-line">가격 반응</span><span className="sim-heading-line">가정</span></span>
                <span><span className="sim-heading-line">강좌별 가정</span><span className="sim-heading-line">인상액</span></span>
                <span><span className="sim-heading-line">변경 한도 내</span><span className="sim-heading-line">{itemLabel}</span></span>
                <span><span className="sim-heading-line">전체 대비</span><span className="sim-heading-line">한도 내 비율</span></span>
                <span><span className="sim-heading-line">새로 한도 내에</span><span className="sim-heading-line">들어온 {itemLabel}</span></span>
                <span><span className="sim-heading-line">변경 한도와 가격이</span><span className="sim-heading-line">같은 {itemLabel}</span></span>
              </div>
              {sim.scenarios.map((s, i) => (
                <div className="sim-row" key={s.key}>
                  <b>■ {["가격 동결", "절반 상승", "전액 상승"][i]}</b>
                  <span>+{won(s.assumed_price_increase_krw)}</span>
                  <strong>{s.eligible_count.toLocaleString()}{itemUnit}</strong>
                  <span>
                    <i
                      style={{
                        width: `${(s.eligible_count / s.compared_records) * 100}%`,
                      }}
                    />{" "}
                    {((s.eligible_count / s.compared_records) * 100).toFixed(1)}
                    %
                  </span>
                  <span>+{s.newly_eligible_count.toLocaleString()}{itemUnit}</span>
                  <span>{s.at_new_cap_count.toLocaleString()}{itemUnit}</span>
                </div>
              ))}
            </div>
            <small>{sim.interpretation}</small>
          </>
        ) : (
          <div className="empty">
            <b>선택 조건의 기록이 없습니다</b>
            <p>지원되는 기간·지역·종목을 선택해 주세요.</p>
          </div>
        )}
      </section>
      <section className="wrap history" id="history">
        <SectionTitle>과거 가격 구성</SectionTitle>
        <div className="history-grid">
          <div>
            <h3>기간별 월 한도와 같은 가격의 강좌 비율</h3>
            <p className="history-range">
              공개 가격 기록의 2020년부터 2026년까지를 집계했습니다. 2024년 이후는 2024~2026년, 전체 관측 기간은 2020~2026년 합계입니다.
            </p>
            <div className="bars" aria-label="2020년부터 2026년까지 월 한도와 같은 가격의 강좌 비율">
              {annualYears.map((y) => (
                <div className="bar-item" key={y.year}>
                  <b className="bar-ratio">{(y.ratio_at_cap * 100).toFixed(1)}%</b>
                  <div className="bar-track" aria-hidden="true">
                    <i style={{ height: `${y.ratio_at_cap * 100}%` }} />
                  </div>
                  <div className="bar-details">
                    <strong>{y.year}년</strong>
                    <span>{y.cap_krw ? won(y.cap_krw) : "기간별 한도 다름"}</span>
                    <span>
                      {unit === "unique_course" ? "집계 강좌" : "집계 월별 기록"}{" "}
                      {y.denominator.toLocaleString()}건
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="history-summaries">
              {periodSummaries.map((summary) => (
                <div key={summary.year}>
                  <strong>{summary.year === "2024plus" ? "2024년 이후" : "전체 관측 기간"}</strong>
                  <b>{(summary.ratio_at_cap * 100).toFixed(1)}%</b>
                  <span>적용 한도 {summary.cap_krw ? won(summary.cap_krw) : "기간별 한도 다름"}</span>
                  <span>
                    {unit === "unique_course" ? "집계 강좌" : "집계 월별 기록"}{" "}
                    {summary.denominator.toLocaleString()}건
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3>동일 강좌의 가격 변화 (2023 → 2024)</h3>
            <dl>
              <div>
                <dt>비교 대상</dt>
                <dd>
                  {history.same_id_2023_2024.same_id_count.toLocaleString()}개
                </dd>
              </div>
              <div>
                <dt>가격 유지</dt>
                <dd>{history.same_id_2023_2024.unchanged.toLocaleString()}개</dd>
              </div>
              <div>
                <dt>가격 상승</dt>
                <dd>{history.same_id_2023_2024.up.toLocaleString()}개</dd>
              </div>
              <div>
                <dt>가격 하락</dt>
                <dd>{history.same_id_2023_2024.down.toLocaleString()}개</dd>
              </div>
              <div>
                <dt>2023년에만 관측된 강좌</dt>
                <dd>{history.same_id_2023_2024.exit_ids_2023.toLocaleString()}개</dd>
              </div>
              <div>
                <dt>2024년에만 관측된 강좌</dt>
                <dd>{history.same_id_2023_2024.entry_ids_2024.toLocaleString()}개</dd>
              </div>
            </dl>
            <p>{history.interpretation}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
function Metric({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}
