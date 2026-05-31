import { useEffect, useState, useCallback } from 'react'
import {
  Table, Button, Modal, Form, Input, InputNumber, Select,
  Space, Popconfirm, message, Typography, Checkbox,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnType } from 'antd/es/table'
import { api } from '../utils/api'
import PageHeader from './PageHeader'
import EmptyState from './EmptyState'

const { Text } = Typography

export interface FieldDef {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'select-remote' | 'checkbox'
  required?: boolean
  min?: number
  placeholder?: string
  selectOptions?: { label: string; value: any }[]
  remoteUrl?: string
  remoteLabel?: string
  remoteValue?: string
  tableRender?: (val: any, row: any) => React.ReactNode
  hideInTable?: boolean
  hideInForm?: boolean
  searchable?: boolean
  formSpan?: number
  showWhen?: (values: any, remoteOptions: Record<string, any[]>) => boolean
  normalizePayload?: (values: any) => void
}

interface Props {
  title: string
  subtitle?: string
  crumbs?: { label: string; path?: string }[]
  apiPath: string
  fields: FieldDef[]
  rowKey?: string
  canDelete?: boolean
  extraActions?: (record: any) => React.ReactNode
}

export default function CatalogPage({
  title, subtitle, crumbs, apiPath, fields, rowKey = 'id', canDelete = true, extraActions,
}: Props) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<any>(null)
  const [remoteOptions, setRemoteOptions] = useState<Record<string, any[]>>({})
  const [search, setSearch] = useState('')
  const [form] = Form.useForm()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = search ? { search } : {}
      const { data: res } = await api.get(apiPath, { params })
      setData(res)
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }, [apiPath, search])

  const fetchRemoteOptions = useCallback(async () => {
    const remoteFields = fields.filter((f) => f.type === 'select-remote' && f.remoteUrl)
    await Promise.all(remoteFields.map(async (f) => {
      try {
        const { data: opts } = await api.get(f.remoteUrl!)
        setRemoteOptions((prev) => ({ ...prev, [f.key]: opts }))
      } catch {}
    }))
  }, [fields])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchRemoteOptions() }, [fetchRemoteOptions])

  const openCreate = () => {
    setEditRecord(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (record: any) => {
    setEditRecord(record)
    const values: any = {}
    fields.forEach((f) => { values[f.key] = record[f.key] })
    if ('capacity_value' in record || 'capacity_unit_id' in record) {
      values.has_capacity = record.capacity_value != null && record.capacity_unit_id != null
    }
    form.setFieldsValue(values)
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      fields.forEach((field) => field.normalizePayload?.(values))
      if (editRecord) {
        await api.put(`${apiPath}/${editRecord[rowKey]}`, values)
        message.success('Запись обновлена')
      } else {
        await api.post(apiPath, values)
        message.success('Запись добавлена')
      }
      setModalOpen(false)
      fetchData()
    } catch (e: any) {
      if (e?.response?.data?.error) {
        message.error(e.response.data.error)
      }
    }
  }

  const handleDelete = async (record: any) => {
    try {
      await api.delete(`${apiPath}/${record[rowKey]}`)
      message.success('Запись удалена')
      fetchData()
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'Ошибка удаления')
    }
  }

  const tableCols: ColumnType<any>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 64,
      render: (v) => (
        <Text style={{ color: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'monospace' }}>
          #{v}
        </Text>
      ),
    },
    ...fields
      .filter((f) => !f.hideInTable)
      .map((f) => ({
        title: f.label,
        dataIndex: f.key,
        key: f.key,
        render: f.tableRender
          ? f.tableRender
          : f.type === 'select-remote'
          ? (_val: any, row: any) => {
              const labelField = f.remoteLabel || 'name'
              const nested = f.key.split('.').reduce((o: any, p) => o?.[p], row)
              if (typeof nested === 'object' && nested !== null) return nested[labelField]
              const opts = remoteOptions[f.key] || []
              const found = opts.find((o) => o.id === row[f.key])
              return found?.[labelField] ?? row[f.key] ?? '—'
            }
          : undefined,
      })),
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: any, record: any) => (
        <Space size={4}>
          {extraActions?.(record)}
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
            style={{ color: 'var(--color-accent)', borderColor: 'var(--color-border)' }}
          />
          {canDelete && (
            <Popconfirm
              title="Удалить запись?"
              description="Это действие нельзя отменить"
              onConfirm={() => handleDelete(record)}
              okText="Удалить"
              cancelText="Отмена"
              okButtonProps={{ danger: true, size: 'middle' }}
              cancelButtonProps={{ size: 'middle' }}
            >
              <Button size="small" icon={<DeleteOutlined />} danger />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  const hasSearch = fields.some((f) => f.searchable)
  const addButton = (
    <Button
      type="primary"
      icon={<PlusOutlined />}
      size="large"
      onClick={openCreate}
      style={{ height: 48, paddingInline: 24, fontSize: 14, fontWeight: 600 }}
    >
      Добавить
    </Button>
  )

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        crumbs={crumbs}
        action={addButton}
      />

      {hasSearch && (
        <div style={{ marginBottom: 16 }}>
          <Input
            prefix={<SearchOutlined style={{ color: 'var(--color-text-muted)' }} />}
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 300, height: 40 }}
            allowClear
          />
        </div>
      )}

      {/* Desktop table */}
      <div className="desktop-table">
        {!loading && data.length === 0 ? (
          <EmptyState
            title={`Нет записей в разделе «${title}»`}
            description="Добавьте первую запись через кнопку «Добавить»"
            action={{ label: 'Добавить первую запись', onClick: openCreate }}
          />
        ) : (
          <Table
            dataSource={data}
            columns={tableCols}
            rowKey={rowKey}
            loading={loading}
            size="middle"
            pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (t) => `Всего: ${t}` }}
            locale={{ emptyText: 'Нет данных' }}
            scroll={{ x: true }}
            style={{
              background: 'var(--color-surface)',
              borderRadius: 10,
              overflow: 'hidden',
              border: '1px solid var(--color-border)',
            }}
          />
        )}
      </div>

      {/* Mobile cards */}
      <div className="mobile-cards" style={{ flexDirection: 'column', display: 'none' }}>
        {data.length === 0 && !loading && (
          <EmptyState action={{ label: 'Добавить', onClick: openCreate }} />
        )}
        {data.map((record) => (
          <div key={record[rowKey]} className="mobile-card-item">
            {fields.filter((f) => !f.hideInTable).map((f, i) => (
              <div key={f.key} className="item-detail">
                {i === 0 ? (
                  <div className="item-name">{String(record[f.key] ?? '—')}</div>
                ) : (
                  <>
                    <span style={{ color: 'var(--color-text-muted)' }}>{f.label}: </span>
                    <span>{f.tableRender ? f.tableRender(record[f.key], record) : String(record[f.key] ?? '—')}</span>
                  </>
                )}
              </div>
            ))}
            <div className="item-actions">
              <Button icon={<EditOutlined />} onClick={() => openEdit(record)} style={{ flex: 1, height: 48, fontSize: 15 }}>
                Изменить
              </Button>
              {canDelete && (
                <Popconfirm title="Удалить?" onConfirm={() => handleDelete(record)} okText="Да" cancelText="Нет">
                  <Button danger icon={<DeleteOutlined />} style={{ height: 48, width: 48 }} />
                </Popconfirm>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        title={
          <span style={{ fontSize: 16, fontWeight: 600 }}>
            {editRecord ? `Редактировать: ${editRecord[fields[0]?.key]}` : `Добавить — ${title}`}
          </span>
        }
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText={editRecord ? 'Сохранить изменения' : 'Создать'}
        cancelText="Отмена"
        width={520}
        okButtonProps={{ size: 'large', style: { height: 48, fontWeight: 600 } }}
        cancelButtonProps={{ size: 'large', style: { height: 48 } }}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          {fields.filter((f) => !f.hideInForm).map((f) => (
            <Form.Item noStyle shouldUpdate key={f.key}>
              {({ getFieldsValue }) => {
                if (f.showWhen && !f.showWhen(getFieldsValue(true), remoteOptions)) return null
                return (
                  <Form.Item
                    name={f.key}
                    label={f.type === 'checkbox' ? undefined : f.label}
                    valuePropName={f.type === 'checkbox' ? 'checked' : undefined}
                    rules={f.required !== false && f.type !== 'checkbox' ? [{ required: true, message: `Заполните поле «${f.label}»` }] : []}
                  >
                    {f.type === 'text' ? (
                      <Input size="large" placeholder={f.placeholder || f.label} />
                    ) : f.type === 'number' ? (
                      <InputNumber
                        size="large"
                        style={{ width: '100%' }}
                        min={f.min ?? 1}
                        step={f.min && f.min < 1 ? 0.1 : 1}
                        placeholder={f.placeholder}
                      />
                    ) : f.type === 'checkbox' ? (
                      <Checkbox>{f.label}</Checkbox>
                    ) : f.type === 'select' ? (
                      <Select
                        size="large"
                        showSearch
                        optionFilterProp="label"
                        options={f.selectOptions}
                        placeholder={f.placeholder || `Выберите ${f.label}`}
                      />
                    ) : (
                      <Select
                        size="large"
                        showSearch
                        allowClear={f.required === false}
                        optionFilterProp="label"
                        placeholder={f.placeholder || `Выберите ${f.label}`}
                        options={(remoteOptions[f.key] || []).map((opt) => ({
                          label: opt[f.remoteLabel || 'name'],
                          value: opt[f.remoteValue || 'id'],
                        }))}
                      />
                    )}
                  </Form.Item>
                )
              }}
            </Form.Item>
          ))}
        </Form>
      </Modal>
    </div>
  )
}
