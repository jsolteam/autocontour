import { useEffect, useState, useCallback } from 'react'
import { Row, Col, Typography, Tag, Button, Table, InputNumber, Input, Modal, Form, Select, message } from 'antd'
import {
  InboxOutlined, NodeIndexOutlined, ShopOutlined,
  ExperimentOutlined, ArrowRightOutlined, DatabaseOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { api } from '../utils/api'

const { Text } = Typography

const futureFeatures = [
  {
    icon: <ShopOutlined />,
    color: '#52c41a',
    title: 'Склад готовой продукции',
    description: 'Остатки в штуках и паллетах, приход и отгрузка',
    sprint: 2,
  },
  {
    icon: <NodeIndexOutlined />,
    color: '#fa8c16',
    title: 'Склад производства (цеховой)',
    description: 'Виртуальные склады сырья и материалов, переданных в цех',
    sprint: 3,
  },
  {
    icon: <ExperimentOutlined />,
    color: '#722ed1',
    title: 'Планы производства',
    description: 'Двухэтапный процесс: запуск плана и подтверждение завершения',
    sprint: 4,
  },
]

export default function WarehousePage() {
  const navigate = useNavigate()
  const [rawStock, setRawStock] = useState<any[]>([])
  const [materialStock, setMaterialStock] = useState<any[]>([])
  const [rawMaterials, setRawMaterials] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalType, setModalType] = useState<'raw' | 'materials' | null>(null)
  const [form] = Form.useForm()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [rawStockRes, materialStockRes, rawRes, materialsRes] = await Promise.all([
        api.get('/api/v1/main-stock/raw'),
        api.get('/api/v1/main-stock/materials'),
        api.get('/api/v1/raw-materials'),
        api.get('/api/v1/materials'),
      ])
      setRawStock(rawStockRes.data)
      setMaterialStock(materialStockRes.data)
      setRawMaterials(rawRes.data)
      setMaterials(materialsRes.data)
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'Ошибка загрузки складских остатков')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openStockModal = (type: 'raw' | 'materials', record?: any) => {
    setModalType(type)
    form.resetFields()
    if (record) {
      form.setFieldsValue({
        item_id: type === 'raw' ? record.raw_material_id : record.production_material_id,
      })
    }
  }

  const saveStock = async () => {
    if (!modalType) return
    try {
      const values = await form.validateFields()
      const payload = { number: values.invoice_number, items: [{ item_id: values.item_id, quantity: values.current_stock }] }
      await api.post(modalType === 'raw' ? '/api/v1/invoices/raw-receipts' : '/api/v1/invoices/material-receipts', payload)
      message.success('Приходная накладная проведена')
      setModalType(null)
      fetchData()
    } catch (e: any) {
      if (e?.response?.data?.error) message.error(e.response.data.error)
    }
  }

  return (
    <div>
      <PageHeader
        title="Складской учёт"
        subtitle="Спринт 1.5: основные склады сырья и материалов полностью разделены"
        crumbs={[{ label: 'Склад' }]}
        badge={<Tag color="processing">Изоляция потоков</Tag>}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
        <Col xs={24} lg={12}>
          <div className="warehouse-panel">
            <div className="warehouse-panel__header">
              <div>
                <div className="warehouse-panel__title"><InboxOutlined /> Основной склад сырья</div>
                <Text type="secondary">Химические компоненты, жидкости и реактивы в базовых ЕИ.</Text>
              </div>
              <Button type="primary" onClick={() => openStockModal('raw')}>Оформить приход</Button>
            </div>
            <div className="desktop-table">
              <Table
                rowKey="id"
                dataSource={rawStock}
                loading={loading}
                pagination={false}
                size="middle"
                scroll={{ x: true }}
                columns={[
                  { title: 'Сырьё', render: (_: any, row: any) => row.raw_material?.name ?? '—' },
                  { title: 'Категория', render: (_: any, row: any) => <Tag color="cyan">{row.raw_material?.category?.name ?? '—'}</Tag> },
                  {
                    title: 'Остаток', render: (_: any, row: any) => (
                      <strong>{row.current_stock} {row.raw_material?.base_unit?.name}</strong>
                    ),
                  },
                  { title: '', width: 92, render: (_: any, row: any) => <Button onClick={() => openStockModal('raw', row)}>Пополнить</Button> },
                ]}
              />
            </div>
            <div className="mobile-cards" style={{ flexDirection: 'column', display: 'none' }}>
              {rawStock.map((row) => (
                <div key={row.id} className="mobile-card-item">
                  <div className="item-name">{row.raw_material?.name ?? '—'}</div>
                  <div className="item-detail">Категория: {row.raw_material?.category?.name ?? '—'}</div>
                  <div className="item-detail">Остаток: <strong>{row.current_stock} {row.raw_material?.base_unit?.name}</strong></div>
                  <div className="item-actions">
                    <Button onClick={() => openStockModal('raw', row)} style={{ flex: 1, height: 48 }}>Пополнить</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <div className="warehouse-panel">
            <div className="warehouse-panel__header">
              <div>
                <div className="warehouse-panel__title"><DatabaseOutlined /> Основной склад материалов</div>
                <Text type="secondary">Тара, крышки, этикетки, коробки и паллеты в собственном потоке.</Text>
              </div>
              <Button type="primary" onClick={() => openStockModal('materials')}>Оформить приход</Button>
            </div>
            <div className="desktop-table">
              <Table
                rowKey="id"
                dataSource={materialStock}
                loading={loading}
                pagination={false}
                size="middle"
                scroll={{ x: true }}
                columns={[
                  { title: 'Материал', render: (_: any, row: any) => row.production_material?.name ?? '—' },
                  { title: 'Категория', render: (_: any, row: any) => <Tag color="purple">{row.production_material?.category?.name ?? '—'}</Tag> },
                  {
                    title: 'Остаток', render: (_: any, row: any) => (
                      <strong>{row.current_stock} {row.production_material?.base_unit?.name}</strong>
                    ),
                  },
                  { title: '', width: 92, render: (_: any, row: any) => <Button onClick={() => openStockModal('materials', row)}>Пополнить</Button> },
                ]}
              />
            </div>
            <div className="mobile-cards" style={{ flexDirection: 'column', display: 'none' }}>
              {materialStock.map((row) => (
                <div key={row.id} className="mobile-card-item">
                  <div className="item-name">{row.production_material?.name ?? '—'}</div>
                  <div className="item-detail">Категория: {row.production_material?.category?.name ?? '—'}</div>
                  <div className="item-detail">Остаток: <strong>{row.current_stock} {row.production_material?.base_unit?.name}</strong></div>
                  <div className="item-actions">
                    <Button onClick={() => openStockModal('materials', row)} style={{ flex: 1, height: 48 }}>Пополнить</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Col>
      </Row>

      <div style={{
        background: 'linear-gradient(135deg, rgba(22,119,255,0.08), rgba(22,119,255,0.03))',
        border: '1px solid rgba(22,119,255,0.2)',
        borderRadius: 12,
        padding: '20px 24px',
        marginBottom: 28,
        display: 'flex', alignItems: 'flex-start', gap: 16,
      }}>
        <ArrowRightOutlined style={{ fontSize: 22, color: '#1677ff', flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontWeight: 700, color: '#fff', fontSize: 16, marginBottom: 6 }}>
            Потоки больше не пересекаются
          </div>
          <Text style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Приходы и будущие производственные операции будут обращаться к отдельным таблицам сырья и материалов.
            Номенклатура выбирается только из соответствующего справочника — ручной ввод исключён.
          </Text>
          <div style={{ marginTop: 14 }}>
            <Button type="primary" onClick={() => navigate('/raw-materials')} style={{ marginRight: 8 }}>
              Справочник сырья
            </Button>
            <Button onClick={() => navigate('/materials')}>Справочник материалов</Button>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
        Следующие спринты
      </div>

      <Row gutter={[16, 16]}>
        {futureFeatures.map((f) => (
          <Col xs={24} sm={12} lg={8} key={f.title}>
            <div className="future-card">
              <div style={{
                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                background: `${f.color}15`, border: `1px solid ${f.color}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, color: f.color,
              }}>
                {f.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 14 }}>
                    {f.title}
                  </span>
                  <Tag style={{ fontSize: 10, margin: 0 }}>Спринт {f.sprint}</Tag>
                </div>
                <Text style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{f.description}</Text>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      <Modal
        title={modalType === 'raw' ? 'Приход сырья по накладной' : 'Приход материалов по накладной'}
        open={modalType !== null}
        onOk={saveStock}
        onCancel={() => setModalType(null)}
        okText="Сохранить"
        cancelText="Отмена"
        okButtonProps={{ size: 'large', style: { height: 48 } }}
        cancelButtonProps={{ size: 'large', style: { height: 48 } }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item name="invoice_number" label="Номер накладной" rules={[{ required: true, message: 'Введите номер накладной' }]}>
            <Input size="large" placeholder="Например: INV-2026-001" />
          </Form.Item>
          <Form.Item name="item_id" label={modalType === 'raw' ? 'Сырьё' : 'Материал'} rules={[{ required: true, message: 'Выберите позицию' }]}>
            <Select
              size="large"
              showSearch
              optionFilterProp="label"
              placeholder="Выберите из справочника"
              options={(modalType === 'raw' ? rawMaterials : materials).map((item) => ({ label: item.name, value: item.id }))}
            />
          </Form.Item>
          <Form.Item name="current_stock" label="Количество прихода" rules={[{ required: true, message: 'Укажите количество прихода' }]}>
            <InputNumber size="large" style={{ width: '100%' }} min={0} step={0.1} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
