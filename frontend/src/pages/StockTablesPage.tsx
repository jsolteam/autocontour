import { useCallback, useEffect, useMemo, useState } from 'react'
import { Table, Tag, message, Button, Modal, Form, InputNumber, Alert, Select, DatePicker, Space } from 'antd'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { api } from '../utils/api'
import { labelStatus, statusColors } from '../utils/labels'

const names: Record<string, string> = {
  'production-finished': 'Таблица ГП (Производство)', 'main-finished': 'Таблица ГП (Склад)', raw: 'Таблица сырья (Склад)', materials: 'Таблица материалов (Склад)', production: 'Склад производства',
}

export default function StockTablesPage() {
  const { table = 'raw' } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<Record<string, any[]>>({})
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [edit, setEdit] = useState<any>(null)
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>()
  const [movementDates, setMovementDates] = useState<any>(null)
  const [form] = Form.useForm()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const endpoints = { prodFinished: '/api/v1/production-stock/finished', mainFinished: '/api/v1/main-stock/finished', raw: '/api/v1/main-stock/raw', materials: '/api/v1/main-stock/materials', prodRaw: '/api/v1/production-stock/raw', prodMaterials: '/api/v1/production-stock/materials' }
      const entries = await Promise.all(Object.entries(endpoints).map(async ([key, url]) => [key, (await api.get(url)).data]))
      const invoicesRes = await api.get('/api/v1/invoices')
      setData(Object.fromEntries(entries)); setInvoices(invoicesRes.data)
    } catch (e: any) { message.error(e?.response?.data?.error || 'Ошибка загрузки основных таблиц') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchData() }, [fetchData])

  const categories = useMemo(() => {
    const rows = table === 'raw' ? data.raw || [] : data.materials || []
    const map = new Map<number, string>()
    rows.forEach((r) => {
      const c = table === 'raw' ? r.raw_material?.category : r.production_material?.category
      if (c) map.set(c.id, c.name)
    })
    return [...map.entries()].map(([value, label]) => ({ value, label }))
  }, [data, table])

  const movementRows = (kind: 'raw' | 'material' | 'finished') => invoices.flatMap((inv) => (inv.items || []).filter((it: any) => kind === 'raw' ? it.raw_material : kind === 'material' ? it.production_material : it.finished_product).map((it: any) => ({ ...it, invoice: inv }))).filter((row) => {
    const date = new Date(row.invoice.effective_at || row.invoice.created_at)
    if (movementDates?.[0] && date < movementDates[0].startOf('day').toDate()) return false
    if (movementDates?.[1] && date > movementDates[1].endOf('day').toDate()) return false
    return true
  })
  const openEdit = (record: any, type: 'raw' | 'materials') => { setEdit({ record, type }); form.setFieldsValue({ current_stock: record.current_stock }) }
  const saveEdit = async () => {
    const values = await form.validateFields()
    try {
      if (values.current_stock < 0) { message.error('Остаток не может быть отрицательным'); return }
      await api.post(edit.type === 'raw' ? '/api/v1/main-stock/raw' : '/api/v1/main-stock/materials', edit.type === 'raw' ? { raw_material_id: edit.record.raw_material_id, current_stock: values.current_stock } : { production_material_id: edit.record.production_material_id, current_stock: values.current_stock })
      message.success('Остаток изменен')
      setEdit(null); fetchData()
    } catch (e: any) { message.error(e?.response?.data?.error || 'Ошибка сохранения') }
  }

  const tableNode = () => {
    if (table === 'production-finished') return <Table rowKey="id" loading={loading} dataSource={data.prodFinished || []} columns={[{ title: 'ГП', render: (_, r) => r.finished_product?.name ?? '—' }, { title: 'Произведено всего', render: (_, r) => <strong>{r.current_stock_units} шт</strong> }]} />
    if (table === 'main-finished') return <Table rowKey="id" loading={loading} dataSource={data.mainFinished || []} columns={[{ title: 'ГП', render: (_, r) => r.finished_product?.name ?? '—' }, { title: 'Остаток, шт', render: (_, r) => <strong>{r.current_stock_units}</strong> }, { title: 'Остаток, паллеты', render: (_, r) => r.current_stock_pallets }]} />
    if (table === 'raw') {
      const rows = (data.raw || []).filter((r) => !categoryFilter || r.raw_material?.category?.id === categoryFilter)
      return <><Select allowClear placeholder="Фильтр по категории" style={{ width: 260, marginBottom: 12 }} options={categories} onChange={setCategoryFilter} /><Table rowKey="id" loading={loading} dataSource={rows} columns={[{ title: 'Сырьё', render: (_, r) => r.raw_material?.name ?? '—' }, { title: 'Категория', render: (_, r) => <Tag color="cyan">{r.raw_material?.category?.name ?? '—'}</Tag> }, { title: 'Остаток', render: (_, r) => <strong>{r.current_stock} {r.raw_material?.base_unit?.name}</strong> }, { title: '', render: (_, r) => <Button onClick={() => openEdit(r, 'raw')}>Редактировать</Button> }]} /></>
    }
    if (table === 'materials') {
      const rows = (data.materials || []).filter((r) => !categoryFilter || r.production_material?.category?.id === categoryFilter)
      return <><Select allowClear placeholder="Фильтр по категории" style={{ width: 260, marginBottom: 12 }} options={categories} onChange={setCategoryFilter} /><Table rowKey="id" loading={loading} dataSource={rows} columns={[{ title: 'Материал', render: (_, r) => r.production_material?.name ?? '—' }, { title: 'Категория', render: (_, r) => <Tag color="purple">{r.production_material?.category?.name ?? '—'}</Tag> }, { title: 'Остаток', render: (_, r) => <strong>{r.current_stock} {r.production_material?.base_unit?.name}</strong> }, { title: '', render: (_, r) => <Button onClick={() => openEdit(r, 'materials')}>Редактировать</Button> }]} /></>
    }
    return <div><h3>Сырьё</h3><Table rowKey="id" pagination={false} dataSource={data.prodRaw || []} columns={[{ title: 'Наименование', render: (_, r) => r.raw_material?.name }, { title: 'Категория', render: (_, r) => <b>{r.raw_material?.category?.name}</b> }, { title: 'Остаток', render: (_, r) => `${r.current_stock} ${r.raw_material?.base_unit?.name}` }]} /><h3 style={{ marginTop: 24 }}>Материалы</h3><Table rowKey="id" pagination={false} dataSource={data.prodMaterials || []} columns={[{ title: 'Наименование', render: (_, r) => r.production_material?.name }, { title: 'Категория', render: (_, r) => <b>{r.production_material?.category?.name}</b> }, { title: 'Остаток', render: (_, r) => `${r.current_stock} ${r.production_material?.base_unit?.name}` }]} /><h3 style={{ marginTop: 24 }}>ГП</h3><Table rowKey="id" pagination={false} dataSource={data.prodFinished || []} columns={[{ title: 'Наименование', render: (_, r) => r.finished_product?.name }, { title: 'Остаток', render: (_, r) => `${r.current_stock_units} шт` }]} /></div>
  }

  return <div>
    <PageHeader title={names[table] || 'Основные таблицы'} subtitle="Просмотр остатков, движений и контрольных значений" crumbs={[{ label: 'Основные таблицы' }]} />
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>{Object.entries(names).map(([key, label]) => <Button key={key} type={key === table ? 'primary' : 'default'} onClick={() => navigate(`/stock-tables/${key}`)}>{label}</Button>)}</div>
    {table !== 'production' && <Table size="small" rowKey={(r) => `${r.invoice.id}-${r.id}`} dataSource={movementRows(table === 'materials' ? 'material' : table === 'main-finished' || table === 'production-finished' ? 'finished' : 'raw')} pagination={{ pageSize: 5 }} title={() => <Space wrap><span>Движения по накладным</span><DatePicker.RangePicker placeholder={['День от', 'День до']} format="DD.MM.YYYY" onChange={setMovementDates} /></Space>} columns={[{ title: 'Дата', render: (_, r) => new Date(r.invoice.effective_at || r.invoice.created_at).toLocaleString('ru-RU') }, { title: 'Накладная', render: (_, r) => r.invoice.number }, { title: 'Позиция', render: (_, r) => r.raw_material?.name || r.production_material?.name || r.finished_product?.name }, { title: 'Количество', dataIndex: 'quantity' }, { title: 'Статус', render: (_, r) => <Tag color={statusColors[r.invoice.status]}>{labelStatus(r.invoice.status)}</Tag> }]} />}
    {tableNode()}
    <Modal title="Ручное редактирование остатка" open={!!edit} onOk={saveEdit} onCancel={() => setEdit(null)} okText="Сохранить" cancelText="Отмена">
      <Alert type="warning" showIcon message="Внимание" description="Ручное изменение основных таблиц может негативно повлиять на отчеты и расчеты. Используйте его только для корректировок." style={{ marginBottom: 16 }} />
      <Form form={form} layout="vertical"><Form.Item name="current_stock" label="Новый остаток" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Form>
    </Modal>
  </div>
}
