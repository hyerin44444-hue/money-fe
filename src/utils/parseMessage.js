import dayjs from 'dayjs'

/**
 * 토스뱅크 알림 메시지 파싱
 * [토스뱅크] 체크카드 국내 결제
 * 박*규님의 생활비 카드
 * 15,060원 결제 | (주)이마트 평택점
 * 잔액 13,974원
 */
function parseTossBank(text) {
  // 금액: 숫자,숫자원 결제
  const amountMatch = text.match(/([\d,]+)원 결제/)
  // 사용처: 결제 | 사용처
  const merchantMatch = text.match(/결제\s*\|\s*(.+)/)

  if (!amountMatch || !merchantMatch) return null

  const amount = parseInt(amountMatch[1].replace(/,/g, ''), 10)
  const merchant = merchantMatch[1].trim()

  return {
    date: dayjs().format('YYYY-MM-DD'),
    type: 'expense',
    category: '',
    amount,
    note: merchant,
  }
}

/**
 * 메시지 파싱 진입점 — 포맷 자동 감지
 */
export function parseMessage(text) {
  if (text.includes('[토스뱅크]')) return parseTossBank(text)
  return null
}
