import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Form, InputNumber, message, Modal, Popconfirm, Select, Space, Table, Tag, Tabs, Typography } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { api } from '../utils/api'
import CatalogPage from '../components/CatalogPage'

const rawCategoryColors: Record<string, string> = {
  'ПАВ': 'blue', 'Кислоты': 'volcano', 'Отдушки': 'purple', 'Вода': 'cyan', 'Прочее сырьё': 'default',
}
const materialCategoryColors: Record<string, string> = {
  'Флаконы': 'cyan', 'Канистры пустые': 'blue', 'Коробки': 'purple', 'Паллеты': 'geekblue',
  'Крышки': 'green', 'Этикетки': 'gold', 'Прочие материалы': 'default',
}

const categorySupportsCapacity = (values: any, remoteOptions: Record<string, any[]>) => {
  const categories = remoteOptions.category_id || []
  return Boolean(categories.find((cat: any) => cat.id === values.category_id)?.supports_capacity)
}
const hasCapacitySelected = (values: any, remoteOptions: Record<string, any[]>) => {
  return categorySupportsCapacity(values, remoteOptions) && Boolean(values.has_capacity)
}
const normalizeCapacityPayload = (values: any) => {
  if (!values.has_capacity) {
    values.capacity_value = null
    values.capacity_unit_id = null
  }
  delete values.has_capacity
}

export function UnitsPage() {
  return (
    <CatalogPage
      title="Единицы измерения"
      subtitle="шт, кг, л, паллета, бочка и другие ЕИ"
      crumbs={[{ label: 'Справочники' }, { label: 'Единицы измерения' }]}
      apiPath="/api/v1/units"
      fields={[
        { key: 'name', label: 'Наименование', type: 'text', required: true, searchable: true, placeholder: 'шт, кг, л, паллета...' },
      ]}
    />
  )
}

export function RawMaterialCategoriesPage() {
  return (
    <CatalogPage
      title="Категории сырья"
      subtitle="ПАВ, кислоты, отдушки, вода и другие химические группы"
      crumbs={[{ label: 'Справочники' }, { label: 'Категории сырья' }]}
      apiPath="/api/v1/raw-material-categories"
      fields={[{ key: 'name', label: 'Название', type: 'text', required: true, searchable: true }]}
    />
  )
}

export function MaterialCategoriesPage() {
  return (
    <CatalogPage
      title="Категории материалов"
      subtitle="Категории упаковки и материалов с признаком поддержки вместимости"
      crumbs={[{ label: 'Справочники' }, { label: 'Категории материалов' }]}
      apiPath="/api/v1/material-categories"
      fields={[
        { key: 'name', label: 'Название', type: 'text', required: true, searchable: true },
        {
          key: 'supports_capacity', label: 'Категория может иметь вместимость', type: 'checkbox', required: false,
          tableRender: (val: boolean) => <Tag color={val ? 'success' : 'default'}>{val ? 'Да' : 'Нет'}</Tag>,
        },
      ]}
    />
  )
}

interface Unit { id: number; name: string }
interface CatalogItem { id: number; name: string }
interface Conversion {
  id: number
  nomenclature_type: 'raw' | 'material'
  item_id?: number | null
  raw_material?: CatalogItem
  material?: CatalogItem
  from_unit_id: number
  from_unit?: Unit
  to_unit_id: number
  to_unit?: Unit
  coefficient: number
}

const { Text } = Typography

export function ConversionsPage() {
  const [form] = Form.useForm()
  const selectedType = Form.useWatch('nomenclature_type', form) || 'raw'
  const [data, setData] = useState<Conversion[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [rawMaterials, setRawMaterials] = useState<CatalogItem[]>([])
  const [materials, setMaterials] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<Conversion | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [conversionsRes, unitsRes, rawRes, materialsRes] = await Promise.all([
        api.get('/api/v1/conversions'),
        api.get('/api/v1/units'),
        api.get('/api/v1/raw-materials'),
        api.get('/api/v1/materials'),
      ])
      setData(conversionsRes.data)
      setUnits(unitsRes.data)
      setRawMaterials(rawRes.data)
      setMaterials(materialsRes.data)
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'Ошибка загрузки коэффициентов')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const itemOptions = useMemo(() => {
    const items = selectedType === 'material' ? materials : rawMaterials
    return items.map((item) => ({ label: item.name, value: item.id }))
  }, [materials, rawMaterials, selectedType])

  const openCreate = () => {
    setEditRecord(null)
    form.resetFields()
    form.setFieldsValue({ nomenclature_type: 'raw' })
    setModalOpen(true)
  }

  const openEdit = (record: Conversion) => {
    setEditRecord(record)
    form.setFieldsValue({
      nomenclature_type: record.nomenclature_type,
      item_id: record.item_id ?? undefined,
      from_unit_id: record.from_unit_id,
      to_unit_id: record.to_unit_id,
      coefficient: record.coefficient,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const payload = { ...values, item_id: values.item_id ?? null }
      if (editRecord) {
        await api.put(`/api/v1/conversions/${editRecord.id}`, payload)
        message.success('Коэффициент обновлён')
      } else {
        await api.post('/api/v1/conversions', payload)
        message.success('Коэффициент добавлен')
      }
      setModalOpen(false)
      fetchAll()
    } catch (e: any) {
      if (e?.response?.data?.error) message.error(e.response.data.error)
    }
  }

  const handleDelete = async (record: Conversion) => {
    try {
      await api.delete(`/api/v1/conversions/${record.id}`)
      message.success('Коэффициент удалён')
      fetchAll()
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'Ошибка удаления')
    }
  }

  const renderItem = (record: Conversion) => {
    const item = record.nomenclature_type === 'raw' ? record.raw_material : record.material
    return item?.name || <Text style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Универсальный для типа</Text>
  }

  const columns = [
    {
      title: 'Тип', dataIndex: 'nomenclature_type', width: 120,
      render: (val: string) => <Tag color={val === 'raw' ? 'cyan' : 'purple'}>{val === 'raw' ? 'Сырьё' : 'Материал'}</Tag>,
    },
    { title: 'Объект', render: (_: any, record: Conversion) => renderItem(record) },
    { title: 'Из', render: (_: any, record: Conversion) => record.from_unit?.name ?? '—' },
    { title: 'В', render: (_: any, record: Conversion) => record.to_unit?.name ?? '—' },
    {
      title: 'Коэффициент', dataIndex: 'coefficient',
      render: (val: number) => <Tag color="blue" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{val}</Tag>,
    },
    {
      title: '', key: 'actions', width: 100,
      render: (_: any, record: Conversion) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Удалить коэффициент?" onConfirm={() => handleDelete(record)} okText="Удалить" cancelText="Отмена">
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              Коэффициенты перевода
            </h1>
            <Text style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
              Выберите сырьё/материал из списка или оставьте объект пустым — коэффициент будет универсальным для типа.
            </Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={openCreate} style={{ height: 48, fontWeight: 600 }}>
            Добавить
          </Button>
        </div>
        <div style={{ height: 1, background: 'var(--color-border)', marginTop: 16 }} />
      </div>

      <div className="desktop-table">
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (t) => `Всего: ${t}` }}
          scroll={{ x: true }}
          style={{ background: 'var(--color-surface)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--color-border)' }}
        />
      </div>

      <div className="mobile-cards" style={{ flexDirection: 'column', display: 'none' }}>
        {data.map((record) => (
          <div key={record.id} className="mobile-card-item">
            <div className="item-name">{renderItem(record)}</div>
            <div className="item-detail"><span>Тип: </span>{record.nomenclature_type === 'raw' ? 'Сырьё' : 'Материал'}</div>
            <div className="item-detail"><span>Из: </span>{record.from_unit?.name ?? '—'}</div>
            <div className="item-detail"><span>В: </span>{record.to_unit?.name ?? '—'}</div>
            <div className="item-detail"><span>Коэффициент: </span>{record.coefficient}</div>
            <div className="item-actions">
              <Button icon={<EditOutlined />} onClick={() => openEdit(record)} style={{ flex: 1, height: 48 }}>Изменить</Button>
              <Popconfirm title="Удалить?" onConfirm={() => handleDelete(record)} okText="Да" cancelText="Нет">
                <Button danger icon={<DeleteOutlined />} style={{ height: 48, width: 48 }} />
              </Popconfirm>
            </div>
          </div>
        ))}
      </div>

      <Modal
        title={editRecord ? 'Редактировать коэффициент' : 'Добавить коэффициент'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText={editRecord ? 'Сохранить' : 'Создать'}
        cancelText="Отмена"
        width={560}
        okButtonProps={{ size: 'large', style: { height: 48, fontWeight: 600 } }}
        cancelButtonProps={{ size: 'large', style: { height: 48 } }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item name="nomenclature_type" label="Тип номенклатуры" rules={[{ required: true, message: 'Выберите тип' }]}>
            <Select
              size="large"
              options={[
                { label: 'Сырьё', value: 'raw' },
                { label: 'Материал', value: 'material' },
              ]}
              onChange={() => form.setFieldValue('item_id', undefined)}
            />
          </Form.Item>
          <Form.Item name="item_id" label="Объект" extra="Не выбирайте объект, если коэффициент должен быть универсальным для всего типа.">
            <Select
              size="large"
              showSearch
              allowClear
              optionFilterProp="label"
              placeholder="Универсальный коэффициент"
              options={itemOptions}
            />
          </Form.Item>
          <Form.Item name="from_unit_id" label="Из единицы" rules={[{ required: true, message: 'Выберите исходную ЕИ' }]}>
            <Select size="large" showSearch optionFilterProp="label" options={units.map((unit) => ({ label: unit.name, value: unit.id }))} />
          </Form.Item>
          <Form.Item name="to_unit_id" label="В единицу" rules={[{ required: true, message: 'Выберите целевую ЕИ' }]}>
            <Select size="large" showSearch optionFilterProp="label" options={units.map((unit) => ({ label: unit.name, value: unit.id }))} />
          </Form.Item>
          <Form.Item name="coefficient" label="Коэффициент" rules={[{ required: true, message: 'Укажите коэффициент' }]}>
            <InputNumber size="large" style={{ width: '100%' }} min={0.0001} step={0.1} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export function RawMaterialsPage() {
  return (
    <CatalogPage
      title="Сырьё"
      subtitle="Изолированный справочник химических компонентов, жидкостей и реактивов"
      crumbs={[{ label: 'Справочники' }, { label: 'Сырьё' }]}
      apiPath="/api/v1/raw-materials"
      fields={[
        { key: 'name', label: 'Наименование', type: 'text', required: true, searchable: true },
        {
          key: 'category_id', label: 'Категория сырья', type: 'select-remote',
          remoteUrl: '/api/v1/raw-material-categories', remoteLabel: 'name', remoteValue: 'id',
          tableRender: (_val: any, row: any) => <Tag color={rawCategoryColors[row.category?.name] || 'default'}>{row.category?.name ?? '—'}</Tag>,
        },
        {
          key: 'base_unit_id', label: 'Базовая ЕИ', type: 'select-remote',
          remoteUrl: '/api/v1/units', remoteLabel: 'name', remoteValue: 'id',
          tableRender: (_val: any, row: any) => <Tag style={{ fontFamily: 'monospace' }}>{row.base_unit?.name ?? '—'}</Tag>,
        },
      ]}
    />
  )
}

export function MaterialsPage() {
  return (
    <CatalogPage
      title="Материалы"
      subtitle="Изолированный справочник тары, крышек, этикеток, коробок и паллет"
      crumbs={[{ label: 'Справочники' }, { label: 'Материалы' }]}
      apiPath="/api/v1/materials"
      fields={[
        { key: 'name', label: 'Наименование', type: 'text', required: true, searchable: true },
        {
          key: 'category_id', label: 'Категория материалов', type: 'select-remote',
          remoteUrl: '/api/v1/material-categories', remoteLabel: 'name', remoteValue: 'id',
          tableRender: (_val: any, row: any) => <Tag color={materialCategoryColors[row.category?.name] || 'default'}>{row.category?.name ?? '—'}</Tag>,
        },
        {
          key: 'base_unit_id', label: 'Базовая ЕИ', type: 'select-remote',
          remoteUrl: '/api/v1/units', remoteLabel: 'name', remoteValue: 'id',
          tableRender: (_val: any, row: any) => <Tag style={{ fontFamily: 'monospace' }}>{row.base_unit?.name ?? '—'}</Tag>,
        },
        {
          key: 'has_capacity', label: 'Имеет вместимость', type: 'checkbox', required: false, hideInTable: true,
          showWhen: categorySupportsCapacity, normalizePayload: normalizeCapacityPayload,
        },
        {
          key: 'capacity_value', label: 'Вместимость — значение', type: 'number', required: true, min: 0.0001,
          placeholder: 'Например: 1.0, 5.0, 12.0, 500.0', showWhen: hasCapacitySelected,
          tableRender: (_val: any, row: any) => row.capacity_value
            ? <Tag color="processing">{row.capacity_value} {row.capacity_unit?.name}</Tag>
            : <span style={{ color: 'var(--color-text-muted)' }}>—</span>,
        },
        {
          key: 'capacity_unit_id', label: 'Вместимость — ЕИ', type: 'select-remote', required: true,
          remoteUrl: '/api/v1/units', remoteLabel: 'name', remoteValue: 'id', showWhen: hasCapacitySelected,
          hideInTable: true,
        },
        {
          key: 'has_capacity', label: 'Имеет вместимость', type: 'checkbox', required: false, hideInTable: true,
          showWhen: categorySupportsCapacity, normalizePayload: normalizeCapacityPayload,
        },
        {
          key: 'capacity_value', label: 'Вместимость — значение', type: 'number', required: true, min: 0.0001,
          placeholder: 'Например: 1.0, 5.0, 12.0, 500.0', showWhen: hasCapacitySelected,
          tableRender: (_val: any, row: any) => row.capacity_value
            ? <Tag color="processing">{row.capacity_value} {row.capacity_unit?.name}</Tag>
            : <span style={{ color: 'var(--color-text-muted)' }}>—</span>,
        },
        {
          key: 'capacity_unit_id', label: 'Вместимость — ЕИ', type: 'select-remote', required: true,
          remoteUrl: '/api/v1/units', remoteLabel: 'name', remoteValue: 'id', showWhen: hasCapacitySelected,
          hideInTable: true,
        },
      ]}
    />
  )
}

export function NomenclaturePage() {
  return (
    <Tabs
      items={[
        { key: 'raw', label: 'Сырьё', children: <RawMaterialsPage /> },
        { key: 'materials', label: 'Материалы', children: <MaterialsPage /> },
      ]}
    />
  )
}

export function FinishedProductsPage() {
  return (
    <CatalogPage
      title="Готовая продукция"
      subtitle="Продукты, которые производятся на предприятии"
      crumbs={[{ label: 'Справочники' }, { label: 'Готовая продукция' }]}
      apiPath="/api/v1/finished-products"
      fields={[
        { key: 'name', label: 'Наименование', type: 'text', required: true, searchable: true },
        {
          key: 'base_unit_id', label: 'Базовая ЕИ', type: 'select-remote',
          remoteUrl: '/api/v1/units', remoteLabel: 'name', remoteValue: 'id',
          tableRender: (_val: any, row: any) => (
            <Tag style={{ fontFamily: 'monospace' }}>{row.base_unit?.name ?? 'шт'}</Tag>
          ),
        },
        {
          key: 'pallet_capacity', label: 'Вместимость паллеты (шт)', type: 'number', min: 1,
          placeholder: 'Количество штук в 1 паллете',
          tableRender: (val: any) => (
            <span>
              <strong style={{ color: 'var(--color-text-primary)' }}>{val}</strong>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 11, marginLeft: 4 }}>шт/паллета</span>
            </span>
          ),
        },
      ]}
    />
  )
}
