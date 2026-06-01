import { useCallback, useEffect, useState } from 'react'
import { Button, Descriptions, Drawer, Space, Table, Tag, message, Popconfirm } from 'antd'
import PageHeader from '../components/PageHeader'
import { api } from '../utils/api'
import { labelInvoiceType, labelStatus, statusColors } from '../utils/labels'

const itemName = (row: any) => row.raw_material?.name || row.production_material?.name || row.finished_product?.name || '—'
const itemUnit = (row: any) => row.raw_material?.base_unit?.name || row.production_material?.base_unit?.name || row.finished_product?.base_unit?.name || 'шт'

export default function InvoicesPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<any>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try { setData((await api.get('/api/v1/invoices')).data) }
    catch (e: any) { message.error(e?.response?.data?.error || 'Ошибка загрузки накладных') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchData() }, [fetchData])

  const confirmInvoice = async (id: number) => {
    try { await api.post(`/api/v1/invoices/${id}/confirm`); message.success('Накладная подтверждена'); fetchData() }
    catch (e: any) { message.error(e?.response?.data?.error || 'Ошибка подтверждения') }
  }
  const cancelInvoice = async (id: number) => {
    try { await api.post(`/api/v1/invoices/${id}/cancel`); message.success('Накладная отменена'); fetchData(); setSelected(null) }
    catch (e: any) { message.error(e?.response?.data?.error || 'Ошибка отмены') }
  }

  return <div>
    <PageHeader title="Накладные" subtitle="Подробный просмотр всех складских документов и их строк" crumbs={[{ label: 'Накладные' }]} />
    <Table rowKey="id" loading={loading} dataSource={data} scroll={{ x: true }} columns={[
      { title: 'Номер накладной', dataIndex: 'number' },
      { title: 'Тип', render: (_, r) => labelInvoiceType(r.type) },
      { title: 'Дата операции', render: (_, r) => new Date(r.effective_at || r.created_at).toLocaleString('ru-RU') },
      { title: 'Статус', render: (_, r) => <Tag color={statusColors[r.status]}>{labelStatus(r.status)}</Tag> },
      { title: 'Позиций', render: (_, r) => r.items?.length || 0 },
      { title: '', render: (_, r) => <Space><Button onClick={() => setSelected(r)}>Подробнее</Button>{r.status === 'PENDING' && <Popconfirm title="Подтвердить накладную?" onConfirm={() => confirmInvoice(r.id)} okText="Да" cancelText="Нет"><Button type="primary">Подтвердить</Button></Popconfirm>}</Space> },
    ]} />
    <Drawer width={720} open={!!selected} onClose={() => setSelected(null)} title={selected ? `Накладная ${selected.number}` : 'Накладная'} extra={selected?.status === 'PENDING' && <Popconfirm title="Отменить накладную?" onConfirm={() => cancelInvoice(selected.id)} okText="Отменить" cancelText="Нет"><Button danger>Отменить</Button></Popconfirm>}>
      {selected && <>
        <Descriptions bordered size="small" column={1} items={[
          { key: 'number', label: 'Номер', children: selected.number },
          { key: 'type', label: 'Тип', children: labelInvoiceType(selected.type) },
          { key: 'status', label: 'Статус', children: <Tag color={statusColors[selected.status]}>{labelStatus(selected.status)}</Tag> },
          { key: 'date', label: 'Дата операции', children: new Date(selected.effective_at || selected.created_at).toLocaleString('ru-RU') },
        ]} />
        <Table style={{ marginTop: 20 }} pagination={false} rowKey="id" dataSource={selected.items || []} columns={[
          { title: 'Наименование', render: (_: any, r: any) => itemName(r) },
          { title: 'Количество', render: (_: any, r: any) => `${r.quantity} ${itemUnit(r)}` },
          { title: 'Категория', render: (_: any, r: any) => r.raw_material?.category?.name || r.production_material?.category?.name || 'Готовая продукция' },
        ]} />
      </>}
    </Drawer>
  </div>
}
