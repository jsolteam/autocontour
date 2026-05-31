import { Tag, Tabs } from 'antd'
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

export function ConversionsPage() {
  return (
    <CatalogPage
      title="Коэффициенты перевода"
      subtitle="Конвертация между единицами измерения отдельно для сырья и материалов"
      crumbs={[{ label: 'Справочники' }, { label: 'Коэффициенты' }]}
      apiPath="/api/v1/conversions"
      fields={[
        {
          key: 'nomenclature_type', label: 'Тип номенклатуры', type: 'select',
          selectOptions: [
            { label: 'Сырьё', value: 'raw' },
            { label: 'Материал', value: 'material' },
          ],
          tableRender: (val: string) => <Tag color={val === 'raw' ? 'cyan' : 'purple'}>{val === 'raw' ? 'Сырьё' : 'Материал'}</Tag>,
        },
        {
          key: 'item_id', label: 'ID объекта (необязательно)', type: 'number', required: false, min: 1,
          placeholder: 'Оставьте пустым для универсального коэффициента типа',
          tableRender: (_val: any, row: any) => row.raw_material?.name || row.material?.name
            || <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Универсальный</span>,
        },
        {
          key: 'from_unit_id', label: 'Из единицы', type: 'select-remote',
          remoteUrl: '/api/v1/units', remoteLabel: 'name', remoteValue: 'id',
          tableRender: (_val: any, row: any) => row.from_unit?.name,
        },
        {
          key: 'to_unit_id', label: 'В единицу', type: 'select-remote',
          remoteUrl: '/api/v1/units', remoteLabel: 'name', remoteValue: 'id',
          tableRender: (_val: any, row: any) => row.to_unit?.name,
        },
        {
          key: 'coefficient', label: 'Коэффициент', type: 'number', min: 0.0001,
          placeholder: 'Например: 200 (1 бочка = 200 л)',
          tableRender: (val: any) => (
            <Tag color="blue" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{val}</Tag>
          ),
        },
      ]}
    />
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
