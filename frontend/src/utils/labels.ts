export const invoiceTypeLabels: Record<string, string> = {
  raw_receipt: 'Приход сырья',
  material_receipt: 'Приход материалов',
  mixed_receipt: 'Приход сырья и материалов',
  raw_issue: 'Расход сырья',
  material_issue: 'Расход материалов',
  finished_shipment: 'Отгрузка готовой продукции',
}

export const statusLabels: Record<string, string> = {
  PENDING: 'Ожидает подтверждения',
  CONFIRMED: 'Подтверждено',
  CANCELED: 'Отменено',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Завершено',
}

export const statusColors: Record<string, string> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  CANCELED: 'default',
  IN_PROGRESS: 'processing',
  COMPLETED: 'success',
}

export const itemTypeLabels: Record<string, string> = {
  raw: 'Сырьё',
  material: 'Материал',
  finished: 'Готовая продукция',
}

export const labelInvoiceType = (value?: string) => value ? invoiceTypeLabels[value] || value : '—'
export const labelStatus = (value?: string) => value ? statusLabels[value] || value : '—'
