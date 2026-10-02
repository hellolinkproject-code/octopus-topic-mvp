import { IMAGE_LIMIT, PDF_LIMIT } from './correctionProducts'
export async function correctionRequest(url, { method = 'GET', body, token, signal } = {}) {
  const response = await fetch(url, {
    method,
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok)
    throw Object.assign(
      new Error(payload.error?.message || 'Request failed. / 요청에 실패했습니다.'),
      { status: response.status },
    )
  return payload
}
const encode = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () =>
      resolve({ mime: file.type, size: file.size, data: String(reader.result).split(',')[1] })
    reader.onerror = () => reject(new Error('Cannot read file. / 파일을 읽을 수 없습니다.'))
    reader.readAsDataURL(file)
  })
export async function prepareFile(file, report = false) {
  if (!file) return null
  const types = report ? ['application/pdf'] : ['image/jpeg', 'image/png']
  if (!types.includes(file.type))
    throw new Error(
      report ? 'PDF only. / PDF만 가능합니다.' : 'JPEG / PNG only. / JPEG, PNG만 가능합니다.',
    )
  if (report) {
    if (file.size > PDF_LIMIT) throw new Error('PDF: maximum 3 MB. / PDF는 최대 3MB입니다.')
    return encode(file)
  }
  if (file.size > 20 * 1024 * 1024)
    throw new Error('Image: maximum 20 MB before compression. / 원본 사진은 최대 20MB입니다.')
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    let blob
    for (const quality of [0.85, 0.7, 0.5]) {
      blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
      if (blob && blob.size <= IMAGE_LIMIT) break
    }
    if (!blob || blob.size > IMAGE_LIMIT)
      throw new Error('Use a smaller image. / 더 작은 사진을 선택해 주세요.')
    return encode(blob)
  } finally {
    bitmap.close()
  }
}
