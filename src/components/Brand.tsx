export function Mark({ inverse = false }: { inverse?: boolean }) {
  return (
    <svg
      className="mark"
      viewBox="0 0 80 64"
      role="img"
      aria-label="V:WHERE 두 팔 번쩍 로고"
    >
      <circle cx="40" cy="13" r="8" fill={inverse ? "#fff" : "#1F5C45"} />
      <path
        d="M17 12 39 45"
        stroke={inverse ? "#fff" : "#1F5C45"}
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M63 12 40 45"
        stroke="#D9774F"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M12 52 Q40 68 68 52"
        fill="none"
        stroke="#9CC7AF"
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function Brand() {
  return (
    <a className="brand" href="#top" aria-label="V:WHERE 홈">
      <Mark />
      <span>
        <b>V:WHERE</b>
        <small>장애인 스포츠강좌 가격 비교</small>
      </span>
    </a>
  );
}
export function Runner() {
  return <img className="runner runner-illustration" src="/images/runner-hero.png" width="1536" height="1024" alt="" aria-hidden="true" />;
}
export function SectionTitle({
  children,
  aside,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="section-title">
      <h2>
        <i aria-hidden="true" />
        {children}
      </h2>
      {aside && <span>{aside}</span>}
    </div>
  );
}
