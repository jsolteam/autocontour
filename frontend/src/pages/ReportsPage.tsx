import { useCallback, useEffect, useMemo, useState } from 'react'
import { Tabs, Table, Tag, message, DatePicker, Select, Space } from 'antd'
import PageHeader from '../components/PageHeader'
import { api } from '../utils/api'
import { labelInvoiceType, labelStatus } from '../utils/labels'

export default function ReportsPage() {
  const [balances, setBalances] = useState<any[]>([])
  const [receipts, setReceipts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [receiptType, setReceiptType] = useState<string>()
  const [dates, setDates] = useState<any>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [b, r] = await Promise.all([api.get('/api/v1/reports/balances'), api.get('/api/v1/reports/receipts')])
      setBalances(b.data); setReceipts(r.data)
    } catch (e: any) { message.error(e?.response?.data?.error || 'Ошибка загрузки отчетов') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchData() }, [fetchData])

  const receiptRows = useMemo(() => receipts.flatMap((inv) => (inv.items || []).map((it: any) => ({ ...it, invoice: inv }))).filter((r) => {
    if (receiptType && r.invoice.type !== receiptType) return false
    if (dates?.[0] && new Date(r.invoice.effective_at || r.invoice.created_at) < dates[0].toDate()) return false
    if (dates?.[1] && new Date(r.invoice.effective_at || r.invoice.created_at) > dates[1].toDate()) return false
    return true
  }), [receipts, receiptType, dates])


  const shippedRows = useMemo(() => receipts
    .flatMap((inv) => (inv.items || []).map((it: any) => ({ ...it, invoice: inv })))
    .filter((r) => {
      if (r.invoice.type !== 'finished_shipment' || r.invoice.status !== 'CONFIRMED' || !r.finished_product) return false
      if (dates?.[0] && new Date(r.invoice.effective_at || r.invoice.created_at) < dates[0].toDate()) return false
      if (dates?.[1] && new Date(r.invoice.effective_at || r.invoice.created_at) > dates[1].toDate()) return false
      return true
    })
    .map((r) => ({ ...r, shipped_units: r.quantity * (r.finished_product?.pallet_capacity || 0) })), [receipts, dates])
  const shippedTotals = useMemo(() => shippedRows.reduce((acc, row) => ({
    pallets: acc.pallets + Number(row.quantity || 0),
    units: acc.units + Number(row.shipped_units || 0),
  }), { pallets: 0, units: 0 }), [shippedRows])

  const balanceTable = (type: string, title: string) => <Table rowKey={(r) => `${r.type}-${r.name}`} title={() => title} loading={loading} dataSource={balances.filter((b) => b.type === type)} scroll={{ x: true }} columns={[
    { title: 'Наименование', dataIndex: 'name' },
    { title: 'Категория', dataIndex: 'category', render: (v) => <Tag>{v}</Tag> },
    { title: 'Склад', render: (_, r) => `${r.main_stock} ${r.unit}` },
    { title: 'Производство', render: (_, r) => `${r.production_stock} ${r.unit}` },
    { title: 'Общий остаток', render: (_, r) => <strong>{r.total} {r.unit}</strong> },
    ...(type === 'finished' ? [{ title: 'Общий остаток, паллеты', render: (_: any, r: any) => <strong>{r.total_pallets} паллет</strong> }] : []),
  ]} />

  return <div>
    <PageHeader title="Отчеты" subtitle="Детальные отчеты по приходам, движениям и остаткам" crumbs={[{ label: 'Отчеты' }]} />
    <Tabs items={[
      { key: 'balances', label: 'Остатки', children: <Space direction="vertical" style={{ width: '100%' }} size={20}>{balanceTable('raw', 'Сырьё')}{balanceTable('material', 'Материалы')}{balanceTable('finished', 'Готовая продукция')}</Space> },
      { key: 'shipments', label: 'Отгрузки ГП', children: <>
        <Space wrap style={{ marginBottom: 12 }}><DatePicker.RangePicker showTime onChange={setDates} /><Tag color="blue">Итого: {shippedTotals.pallets} паллет / {shippedTotals.units} шт</Tag></Space>
        <Table rowKey={(r) => `${r.invoice.id}-${r.id}`} loading={loading} dataSource={shippedRows} scroll={{ x: true }} columns={[
          { title: 'Дата и время', render: (_, r) => new Date(r.invoice.effective_at || r.invoice.created_at).toLocaleString('ru-RU') },
          { title: 'Накладная', render: (_, r) => r.invoice.number },
          { title: 'Готовая продукция', render: (_, r) => r.finished_product?.name || '—' },
          { title: 'Отгружено, паллеты', render: (_, r) => <strong>{r.quantity}</strong> },
          { title: 'Отгружено, шт', render: (_, r) => r.shipped_units },
          { title: 'Вместимость паллеты', render: (_, r) => `${r.finished_product?.pallet_capacity || 0} шт` },
        ]} />
      </> },
      { key: 'receipts', label: 'Приходы и операции', children: <>
        <Space wrap style={{ marginBottom: 12 }}><Select allowClear placeholder="Тип операции" style={{ width: 260 }} onChange={setReceiptType} options={[{ label: 'Приход сырья и материалов', value: 'mixed_receipt' }, { label: 'Приход сырья', value: 'raw_receipt' }, { label: 'Приход материалов', value: 'material_receipt' }, { label: 'Расход сырья', value: 'raw_issue' }, { label: 'Расход материалов', value: 'material_issue' }, { label: 'Отгрузка ГП', value: 'finished_shipment' }]} /><DatePicker.RangePicker showTime onChange={setDates} /></Space>
        <Table rowKey={(r) => `${r.invoice.id}-${r.id}`} loading={loading} dataSource={receiptRows} scroll={{ x: true }} columns={[
          { title: 'Дата и время', render: (_, r) => new Date(r.invoice.effective_at || r.invoice.created_at).toLocaleString('ru-RU') },
          { title: 'Номер накладной', render: (_, r) => r.invoice.number },
          { title: 'Тип', render: (_, r) => <Tag>{labelInvoiceType(r.invoice.type)}</Tag> },
          { title: 'Позиция', render: (_, r) => r.raw_material?.name || r.production_material?.name || r.finished_product?.name },
          { title: 'Категория', render: (_, r) => r.raw_material?.category?.name || r.production_material?.category?.name || 'ГП' },
          { title: 'Количество', render: (_, r) => r.invoice.type === 'finished_shipment' ? `${r.quantity} паллет` : r.quantity },
          { title: 'Статус', render: (_, r) => <Tag color={r.invoice.status === 'CONFIRMED' ? 'success' : 'warning'}>{labelStatus(r.invoice.status)}</Tag> },
        ]} />
      </> },
    ]} />
  </div>
}
