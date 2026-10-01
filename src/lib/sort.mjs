/** 이름이 없는 항목을 뒤로 보내는 한국어 문자열 비교 함수입니다. */
export function compareNullableKo(a, b) {
  const aMissing = a === null || a === undefined || a === ''
  const bMissing = b === null || b === undefined || b === ''
  if (aMissing && bMissing) return 0
  if (aMissing) return 1
  if (bMissing) return -1
  return a.localeCompare(b, 'ko')
}
