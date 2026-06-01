import { useCallback, useEffect, useState } from 'react'
import { Tabs, Table, Tag, message } from 'antd'
import PageHeader from '../components/PageHeader'
import { api } from '../utils/api'

const stockColumn = (title: string, getter: (row: any) => any) => ({ title, render: (_: any, row: any) => getter(row) })

export default function StockTablesPage() {
  const [data, setData] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const endpoints = {
        prodFinished: '/api/v1/production-stock/finished',
        mainFinished: '/api/v1/main-stock/finished',
        raw: '/api/v1/main-stock/raw',
        materials: '/api/v1/main-stock/materials',
        prodRaw: '/api/v1/production-stock/raw',
        prodMaterials: '/api/v1/production-stock/materials',
      }
      const entries = await Promise.all(Object.entries(endpoints).map(async ([key, url]) => [key, (await api.get(url)).data]))
      setData(Object.fromEntries(entries))
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'Ошибка загрузки основных таблиц')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const simpleTable = (rows: any[], columns: any[]) => (
    <>
      <div className="desktop-table"><Table rowKey="id" dataSource={rows} columns={columns} loading={loading} scroll={{ x: true }} /></div>
      <div className="mobile-cards" style={{ flexDirection: 'column', display: 'none' }}>
        {rows.map((row) => <div key={row.id} className="mobile-card-item">{columns.map((col: any, i: number) => <div className={i === 0 ? 'item-name' : 'item-detail'} key={col.title}>{col.title}: {col.render ? col.render(null, row) : row[col.dataIndex]}</div>)}</div>)}
      </div>
    </>
  )

  return (
    <div>
      <PageHeader title="Основные таблицы" subtitle="Оперативный просмотр остатков предприятия и производства" crumbs={[{ label: 'Основные таблицы' }]} />
      <Tabs items={[
        { key: 'prodFinished', label: 'ГП (Производство)', children: simpleTable(data.prodFinished || [], [
          stockColumn('Продукт', (r) => r.finished_product?.name ?? '—'),
          stockColumn('Общее количество', (r) => <strong>{r.current_stock_units} шт</strong>),
        ]) },
        { key: 'mainFinished', label: 'ГП (Склад)', children: simpleTable(data.mainFinished || [], [
          stockColumn('Продукт', (r) => r.finished_product?.name ?? '—'),
          stockColumn('Остаток, шт', (r) => <strong>{r.current_stock_units} шт</strong>),
          stockColumn('Остаток, паллеты', (r) => <Tag>{r.current_stock_pallets} пал.</Tag>),
        ]) },
        { key: 'raw', label: 'Сырьё (Склад)', children: simpleTable(data.raw || [], [
          stockColumn('Сырьё', (r) => r.raw_material?.name ?? '—'),
          stockColumn('Категория', (r) => <Tag color="cyan">{r.raw_material?.category?.name ?? '—'}</Tag>),
          stockColumn('Остаток', (r) => <strong>{r.current_stock} {r.raw_material?.base_unit?.name}</strong>),
        ]) },
        { key: 'materials', label: 'Материалы (Склад)', children: simpleTable(data.materials || [], [
          stockColumn('Материал', (r) => r.production_material?.name ?? '—'),
          stockColumn('Категория', (r) => <Tag color="purple">{r.production_material?.category?.name ?? '—'}</Tag>),
          stockColumn('Остаток', (r) => <strong>{r.current_stock} {r.production_material?.base_unit?.name}</strong>),
        ]) },
        { key: 'production', label: 'Склад производства', children: <Tabs items={[
          { key: 'pr', label: 'Сырьё', children: simpleTable(data.prodRaw || [], [stockColumn('Сырьё', (r) => r.raw_material?.name ?? '—'), stockColumn('Остаток', (r) => <strong>{r.current_stock} {r.raw_material?.base_unit?.name}</strong>)]) },
          { key: 'pm', label: 'Материалы', children: simpleTable(data.prodMaterials || [], [stockColumn('Материал', (r) => r.production_material?.name ?? '—'), stockColumn('Остаток', (r) => <strong>{r.current_stock} {r.production_material?.base_unit?.name}</strong>)]) },
          { key: 'pf', label: 'ГП', children: simpleTable(data.prodFinished || [], [stockColumn('Продукт', (r) => r.finished_product?.name ?? '—'), stockColumn('Остаток', (r) => <strong>{r.current_stock_units} шт</strong>)]) },
        ]} /> },
      ]} />
    </div>
  )
}
