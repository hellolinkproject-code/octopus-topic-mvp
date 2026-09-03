const DAY_MS = 24 * 60 * 60 * 1000
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

export function getKstDateKey(date = new Date()) {
  const shifted = new Date(date.getTime() + KST_OFFSET_MS)
  const year = shifted.getUTCFullYear()
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const day = String(shifted.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getPreviousKstDateKey(date = new Date()) {
  return getKstDateKey(new Date(date.getTime() - DAY_MS))
}

export function getDateKeyDayNumber(dateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  if (!match) return null
  const timestamp = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  const date = new Date(timestamp)
  const isCanonical = getKstDateKey(new Date(timestamp - KST_OFFSET_MS)) === dateKey
  return isCanonical ? Math.floor(date.getTime() / DAY_MS) : null
}
