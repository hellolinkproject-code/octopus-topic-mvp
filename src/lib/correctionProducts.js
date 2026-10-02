export const CORRECTION_PRODUCTS = {
  q53: {
    id: 'q53',
    questionNumbers: [53],
    name: 'TOPIK 53번 첨삭',
    nameEn: 'TOPIK Question 53 correction',
    price: 19900,
  },
  q54: {
    id: 'q54',
    questionNumbers: [54],
    name: 'TOPIK 54번 첨삭',
    nameEn: 'TOPIK Question 54 correction',
    price: 29900,
  },
  bundle: {
    id: 'bundle',
    questionNumbers: [53, 54],
    name: 'TOPIK 53·54번 세트',
    nameEn: 'TOPIK Questions 53 + 54 bundle',
    price: 39900,
  },
}
export const CORRECTION_STATUS = {
  payment: ['pending', 'confirmed'],
  correction: ['submitted', 'in_review', 'completed'],
  delivery: ['not_sent', 'sent'],
}
export const IMAGE_LIMIT = 1024 * 1024
export const PDF_LIMIT = 3 * 1024 * 1024
export const productName = (product, language) =>
  language === 'ko' ? product.name : product.nameEn
export const priceLabel = (amount) => `₩${amount.toLocaleString('en-US')}`
