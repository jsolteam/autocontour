import { Tag } from 'antd'
import CatalogPage from '../components/CatalogPage'

const CATEGORIES = ['Крышки','Бутылки','Этикетки','Хим. реактивы','Упаковка','Сырьё','Вспомогательные материалы','Прочее']
const categoryColors: Record<string, string> = {
  'Крышки':'blue','Бутылки':'cyan','Этикетки':'green','Хим. реактивы':'orange',
  'Упаковка':'purple','Сырьё':'geekblue','Вспомогательные материалы':'gold','Прочее':'default',
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

export function ConversionsPage() {
  return (
    <CatalogPage
      title="Коэффициенты перевода"
      subtitle="Конвертация между единицами измерения (пример: Бочка → 200 л)"
      crumbs={[{ label: 'Справочники' }, { label: 'Коэффициенты' }]}
      apiPath="/api/v1/conversions"
      fields={[
        {
          key: 'nomenclature_id', label: 'Номенклатура (необязательно)', type: 'select-remote',
          remoteUrl: '/api/v1/nomenclature', remoteLabel: 'name', remoteValue: 'id', required: false,
          placeholder: 'Оставьте пустым для универсального коэффициента',
          tableRender: (_val: any, row: any) => row.nomenclature?.name
            ?? <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Универсальный</span>,
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

export function NomenclaturePage() {
  return (
    <CatalogPage
      title="Номенклатура"
      subtitle="Сырьё и материалы — используются в рецептах и складских операциях"
      crumbs={[{ label: 'Справочники' }, { label: 'Номенклатура' }]}
      apiPath="/api/v1/nomenclature"
      fields={[
        { key: 'name', label: 'Наименование', type: 'text', required: true, searchable: true },
        {
          key: 'category', label: 'Категория', type: 'select',
          selectOptions: CATEGORIES.map((c) => ({ label: c, value: c })),
          tableRender: (val: string) => <Tag color={categoryColors[val] || 'default'}>{val}</Tag>,
        },
        {
          key: 'base_unit_id', label: 'Базовая ЕИ', type: 'select-remote',
          remoteUrl: '/api/v1/units', remoteLabel: 'name', remoteValue: 'id',
          tableRender: (_val: any, row: any) => (
            <Tag style={{ fontFamily: 'monospace' }}>{row.base_unit?.name ?? '—'}</Tag>
          ),
        },
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
