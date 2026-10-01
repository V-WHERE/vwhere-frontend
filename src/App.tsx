import { useEffect, useState } from 'react'
import './App.css'
import { Brand } from './components/Brand'
import { UserView } from './components/UserView'
import { StaffView } from './components/StaffView'
import type { BinDocument, Catalog, History, Lookups, MapDocument, Meta } from './types'

type Mode = 'user' | 'staff'
type MenuKey = 'courses' | 'selection' | 'map' | 'history' | 'simulation'
type StaffSection = Exclude<MenuKey, 'courses' | 'selection'>
type AggregateUnit = 'unique_course' | 'monthly_record'

const staffTargets: Record<StaffSection, string> = {
  map: 'map',
  history: 'history',
  simulation: 'simulation',
}

async function json<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`자료를 불러오지 못했습니다 (${response.status})`)
  return response.json() as Promise<T>
}

export default function App() {
  const [mode, setMode] = useState<Mode>('user')
  const [activeMenu, setActiveMenu] = useState<MenuKey>('courses')
  const [pendingSection, setPendingSection] = useState<StaffSection | null>(null)
  const [month, setMonth] = useState('')
  const [region, setRegion] = useState('ALL')
  const [mapProvince, setMapProvince] = useState('ALL')
  const [sport, setSport] = useState('ALL')
  const [period, setPeriod] = useState('2026')
  const [unit, setUnit] = useState<AggregateUnit>('unique_course')
  const [retry, setRetry] = useState(0)
  const [meta, setMeta] = useState<Meta>()
  const [lookups, setLookups] = useState<Lookups>()
  const [catalog, setCatalog] = useState<Catalog>()
  const [map, setMap] = useState<MapDocument>()
  const [bins, setBins] = useState<BinDocument | null>()
  const [history, setHistory] = useState<History>()
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      json<Meta>('/data/meta.json', controller.signal),
      json<Lookups>('/data/lookups.json', controller.signal),
      json<History>('/data/history.json', controller.signal),
    ])
      .then(([nextMeta, nextLookups, nextHistory]) => {
        setMeta(nextMeta)
        setLookups(nextLookups)
        setHistory(nextHistory)
        setMonth((value) => value || nextMeta.default_catalog_month)
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : '자료 읽기 실패')
        }
      })
    return () => controller.abort()
  }, [retry])

  useEffect(() => {
    if (!month) return
    const controller = new AbortController()
    json<Catalog>(`/data/catalog/${month}.json`, controller.signal)
      .then(setCatalog)
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : '자료 읽기 실패')
        }
      })
    return () => controller.abort()
  }, [month, retry])

  useEffect(() => {
    const controller = new AbortController()
    const binsRequest = period === 'all_observed'
      ? Promise.resolve<BinDocument | null>(null)
      : json<BinDocument>(`/data/sim_bins/${period}_${unit}.json`, controller.signal)
    Promise.all([
      json<MapDocument>(`/data/map/${period}_${unit}.json`, controller.signal),
      binsRequest,
    ])
      .then(([nextMap, nextBins]) => {
        setMap(nextMap)
        setBins(nextBins)
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : '자료 읽기 실패')
        }
      })
    return () => controller.abort()
  }, [period, unit, retry])

  useEffect(() => {
    if (mode !== 'staff' || !pendingSection) return
    const target = document.getElementById(staffTargets[pendingSection])
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [mode, pendingSection])

  const navigate = (key: MenuKey) => {
    if (key === 'courses' || key === 'selection') {
      setActiveMenu(key)
      setMode('user')
      window.requestAnimationFrame(() => document.getElementById(key === 'courses' ? 'course-filters' : 'course-selection')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
      return
    }
    setActiveMenu(key)
    setPendingSection(key)
    if (mode === 'staff') {
      window.requestAnimationFrame(() => {
        document.getElementById(staffTargets[key])?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    } else {
      setMode('staff')
    }
  }

  const switchMode = (next: Mode) => {
    if (next === mode) return
    setPendingSection(null)
    setMode(next)
    setActiveMenu(next === 'user' ? 'courses' : 'map')
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  }

  if (error) {
    return (
      <State>
        <b>강좌 가격 자료를 불러오지 못했습니다</b>
        <p>{error}</p>
        <button className="primary" onClick={() => { setError(''); setRetry((value) => value + 1) }}>다시 시도</button>
        <a href="https://dvoucher.kspo.or.kr/main.do">공식 신청 사이트</a>
      </State>
    )
  }

  if (!meta || !lookups || !month || !catalog || catalog.observed_month !== month ||
      !map || map.period !== period || bins === undefined || (bins && (bins.period !== period || bins.unit !== unit)) || !history) {
    return <State><b>V:WHERE 자료를 불러오는 중...</b><p role="status">잠시만 기다려 주세요.</p></State>
  }

  return (
    <div id="top">
      <Header mode={mode} activeMenu={activeMenu} navigate={navigate} switchMode={switchMode} />
      {mode === 'user' ? (
        <UserView meta={meta} catalog={catalog} lookups={lookups} month={month}
          setMonth={setMonth} region={region} setRegion={setRegion}
          sport={sport} setSport={setSport}
          latestReview={month === meta.observed_through && meta.latest_month_low_volume_review} />
      ) : (
        <StaffView lookups={lookups} map={map} bins={bins} history={history}
          period={period} setPeriod={setPeriod} unit={unit} setUnit={setUnit}
          region={region} setRegion={setRegion} sport={sport} setSport={setSport}
          mapProvince={mapProvince} setMapProvince={setMapProvince} />
      )}
      <footer>자료: 장애인스포츠강좌이용권 강좌 가격 기록 · 게시가격 기준 · V:WHERE</footer>
    </div>
  )
}

const userMenuItems: { key: MenuKey; label: string }[] = [
  { key: 'courses', label: '강좌 찾기' },
  { key: 'selection', label: '내 강좌 조합' },
]
const staffMenuItems: { key: MenuKey; label: string }[] = [
  { key: 'map', label: '지역별 가격 현황' },
  { key: 'history', label: '과거 가격 구성' },
  { key: 'simulation', label: '한도 변경 시뮬레이터' },
]

function Header({ mode, activeMenu, navigate, switchMode }: {
  mode: Mode
  activeMenu: MenuKey
  navigate: (key: MenuKey) => void
  switchMode: (mode: Mode) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuItems = mode === 'user' ? userMenuItems : staffMenuItems
  const changeMode = (next: Mode) => { setMenuOpen(false); switchMode(next) }
  const choose = (key: MenuKey) => {
    setMenuOpen(false)
    navigate(key)
  }
  return (
    <>
      <header>
        <div className="wrap header-inner">
          <Brand />
          <nav aria-label={mode === "user" ? "이용자 메뉴" : "담당자 메뉴"}>
            {menuItems.map((item) => (
              <button key={item.key} className={activeMenu === item.key ? 'active' : ''}
                aria-current={activeMenu === item.key ? 'page' : undefined}
                onClick={() => choose(item.key)}>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="desktop-audience"><AudienceSwitch mode={mode} onChange={changeMode} /></div>
          <button className="hamburger" aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'} aria-expanded={menuOpen}
            aria-controls="mobile-navigation" onClick={() => setMenuOpen((value) => !value)}>
            {menuOpen ? '×' : '☰'}
          </button>
        </div>
        <div id="mobile-navigation" className={menuOpen ? 'mobile-nav open' : 'mobile-nav'}>
          {menuItems.map((item) => (
            <button key={item.key} className={activeMenu === item.key ? 'active' : ''}
              aria-current={activeMenu === item.key ? 'page' : undefined}
              onClick={() => choose(item.key)}>
              {item.label}
            </button>
          ))}
        </div>
      </header>
      <div className="mobile-audience"><AudienceSwitch mode={mode} onChange={changeMode} /></div>
    </>
  )
}

function AudienceSwitch({mode, onChange}: {mode: Mode; onChange: (mode: Mode) => void}) {
  return <div className="audience-control">
    <span className="audience-hint">목적에 맞게 화면 전환 <span aria-hidden="true">↔</span></span>
    <div className={`audience-switch ${mode}`} role="group" aria-label="이용 목적에 따른 화면 선택">
      <span className="audience-slider" aria-hidden="true" />
      <button type="button" aria-pressed={mode === 'user'} onClick={() => onChange('user')}>
        <strong>{mode === 'user' && <span aria-hidden="true">✓ </span>}이용자</strong><small>강좌 찾기·조합</small>
      </button>
      <button type="button" aria-pressed={mode === 'staff'} onClick={() => onChange('staff')}>
        <strong>{mode === 'staff' && <span aria-hidden="true">✓ </span>}담당자</strong><small>가격·정책 분석</small>
      </button>
    </div>
  </div>
}

function State({ children }: { children: React.ReactNode }) {
  return <main className="state" role="alert"><Brand />{children}</main>
}
