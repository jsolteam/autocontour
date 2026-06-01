import { useCallback, useEffect, useState } from 'react'
import { Tabs, Table, Tag, message } from 'antd'
import PageHeader from '../components/PageHeader'
import { api } from '../utils/api'

export default function ReportsPage() {
  const [balances, setBalances] = useState<any[]>([])
  const [receipts, setReceipts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [b, r] = await Promise.all([api.get('/api/v1/reports/balances'), api.get('/api/v1/reports/receipts')])
      setBalances(b.data)
      setReceipts(r.data)
    } catch (e: any) { message.error(e?.response?.data?.error || 'Ошибка загрузки отчетов') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchData() }, [fetchData])

  return <div>
    <PageHeader title="Отчеты" subtitle="Приходы и остатки сырья, материалов, готовой продукции" crumbs={[{ label: 'Отчеты' }]} />
    <Tabs items={[
      { key: 'balances', label: 'Остатки', children: <Table rowKey={(r) => `${r.type}-${r.name}`} loading={loading} dataSource={balances} scroll={{ x: true }} columns={[
        { title: 'Наименование', dataIndex: 'name' },
        { title: 'Тип', dataIndex: 'type', render: (v) => <Tag>{v}</Tag> },
        { title: 'Склад', render: (_, r) => `${r.main_stock} ${r.unit}` },
        { title: 'Производство', render: (_, r) => `${r.production_stock} ${r.unit}` },
        { title: 'Общий остаток', render: (_, r) => <strong>{r.total} {r.unit}</strong> },
      ]} /> },
      { key: 'receipts', label: 'Приходы сырья и материалов', children: <Table rowKey="id" loading={loading} dataSource={receipts} scroll={{ x: true }} columns={[
        { title: 'Номер накладной', dataIndex: 'number' },
        { title: 'Тип', dataIndex: 'type', render: (v) => <Tag color={v === 'raw_receipt' ? 'cyan' : 'purple'}>{v === 'raw_receipt' ? 'Сырьё' : 'Материалы'}</Tag> },
        { title: 'Позиций', render: (_, r) => r.items?.length || 0 },
        { title: 'Дата', render: (_, r) => new Date(r.created_at).toLocaleString('ru-RU') },
      ]} /> },
    ]} />
  </div>
}
