import { useEffect, useState, useCallback } from 'react'
import { Row, Col, Typography, Tag, Button, Table, InputNumber, Input, Modal, Form, Select, message, DatePicker, Popconfirm } from 'antd'
import { InboxOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import PageHeader from '../components/PageHeader'
import { api } from '../utils/api'
import dayjs from 'dayjs'

const { Text } = Typography

type InvoiceKind = 'mixed_receipt' | 'raw_issue' | 'material_issue' | 'finished_shipment'

export default function WarehousePage() {
  const [rawStock, setRawStock] = useState<any[]>([])
  const [materialStock, setMaterialStock] = useState<any[]>([])
  const [rawMaterials, setRawMaterials] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [finishedProducts, setFinishedProducts] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [invoiceType, setInvoiceType] = useState<InvoiceKind>('mixed_receipt')
  const [form] = Form.useForm()
  const watchedItems = Form.useWatch('items', form) || []

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [rawStockRes, materialStockRes, rawRes, materialsRes, fpRes, invoicesRes] = await Promise.all([
        api.get('/api/v1/main-stock/raw'),
        api.get('/api/v1/main-stock/materials'),
        api.get('/api/v1/raw-materials'),
        api.get('/api/v1/materials'),
        api.get('/api/v1/finished-products'),
        api.get('/api/v1/invoices'),
      ])
      setRawStock(rawStockRes.data)
      setMaterialStock(materialStockRes.data)
      setRawMaterials(rawRes.data)
      setMaterials(materialsRes.data)
      setFinishedProducts(fpRes.data)
      setInvoices(invoicesRes.data)
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'Ошибка загрузки складских данных')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openInvoice = (type: InvoiceKind) => {
    setInvoiceType(type)
    form.resetFields()
    form.setFieldsValue({ type, effective_at: dayjs(), items: [{ item_type: type === 'material_issue' ? 'material' : type === 'raw_issue' ? 'raw' : type === 'finished_shipment' ? 'finished' : 'raw' }] })
    setModalOpen(true)
  }

  const saveInvoice = async () => {
    try {
      const values = await form.validateFields()
      await api.post('/api/v1/invoices', {
        number: values.number,
        type: values.type,
        effective_at: values.effective_at?.toISOString(),
        items: values.items,
      })
      message.success('Операция создана и ожидает подтверждения на дашборде')
      setModalOpen(false)
      fetchData()
    } catch (e: any) {
      if (e?.response?.data?.error) message.error(e.response.data.error)
    }
  }

  const confirmInvoice = async (id: number) => {
    try {
      await api.post(`/api/v1/invoices/${id}/confirm`)
      message.success('Операция подтверждена')
      fetchData()
    } catch (e: any) { message.error(e?.response?.data?.error || 'Ошибка подтверждения') }
  }

  const itemOptions = (type: string) => {
    if (type === 'raw') return rawMaterials.map((item) => ({ label: item.name, value: item.id }))
    if (type === 'material') return materials.map((item) => ({ label: item.name, value: item.id }))
    return finishedProducts.map((item) => ({ label: item.name, value: item.id }))
  }

  return (
    <div>
      <PageHeader
        title="Накладные и склад"
        subtitle="Оформление приходов, расходов и отгрузок с последующим подтверждением"
        crumbs={[{ label: 'Склад' }]}
        badge={<Tag color="processing">Двухэтапное подтверждение</Tag>}
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={24} md={6}><Button block type="primary" size="large" onClick={() => openInvoice('mixed_receipt')}>Приход сырья/материалов</Button></Col>
        <Col xs={24} md={6}><Button block size="large" onClick={() => openInvoice('raw_issue')}>Расход сырья</Button></Col>
        <Col xs={24} md={6}><Button block size="large" onClick={() => openInvoice('material_issue')}>Расход материалов</Button></Col>
        <Col xs={24} md={6}><Button block danger size="large" onClick={() => openInvoice('finished_shipment')}>Отгрузка ГП</Button></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <div className="warehouse-panel">
            <div className="warehouse-panel__header"><div><div className="warehouse-panel__title"><InboxOutlined /> Основной склад сырья</div><Text type="secondary">Остатки по позициям справочника.</Text></div></div>
            <Table rowKey="id" dataSource={rawStock} loading={loading} pagination={false} scroll={{ x: true }} columns={[
              { title: 'Сырьё', render: (_, row) => row.raw_material?.name ?? '—' },
              { title: 'Категория', render: (_, row) => <Tag color="cyan">{row.raw_material?.category?.name ?? '—'}</Tag> },
              { title: 'Остаток', render: (_, row) => <strong>{row.current_stock} {row.raw_material?.base_unit?.name}</strong> },
            ]} />
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <div className="warehouse-panel">
            <div className="warehouse-panel__header"><div><div className="warehouse-panel__title"><InboxOutlined /> Основной склад материалов</div><Text type="secondary">Остатки по позициям справочника.</Text></div></div>
            <Table rowKey="id" dataSource={materialStock} loading={loading} pagination={false} scroll={{ x: true }} columns={[
              { title: 'Материал', render: (_, row) => row.production_material?.name ?? '—' },
              { title: 'Категория', render: (_, row) => <Tag color="purple">{row.production_material?.category?.name ?? '—'}</Tag> },
              { title: 'Остаток', render: (_, row) => <strong>{row.current_stock} {row.production_material?.base_unit?.name}</strong> },
            ]} />
          </div>
        </Col>
      </Row>

      <div className="warehouse-panel">
        <div className="warehouse-panel__header"><div><div className="warehouse-panel__title">Журнал операций</div><Text type="secondary">Созданные накладные и их статус подтверждения.</Text></div></div>
        <Table rowKey="id" dataSource={invoices} loading={loading} scroll={{ x: true }} columns={[
          { title: 'Номер', dataIndex: 'number' },
          { title: 'Тип', dataIndex: 'type' },
          { title: 'Дата операции', render: (_, row) => row.effective_at ? new Date(row.effective_at).toLocaleString('ru-RU') : '—' },
          { title: 'Статус', render: (_, row) => <Tag color={row.status === 'CONFIRMED' ? 'success' : 'warning'}>{row.status === 'CONFIRMED' ? 'Подтверждена' : 'Ожидает'}</Tag> },
          { title: 'Позиций', render: (_, row) => row.items?.length || 0 },
          { title: '', render: (_, row) => row.status !== 'CONFIRMED' && <Popconfirm title="Подтвердить операцию?" description="Это изменит остатки на складах" onConfirm={() => confirmInvoice(row.id)} okText="Да" cancelText="Нет"><Button>Подтвердить</Button></Popconfirm> },
        ]} />
      </div>

      <Modal title="Складская операция" open={modalOpen} onOk={saveInvoice} onCancel={() => setModalOpen(false)} okText="Создать на подтверждение" cancelText="Отмена" width={860}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col xs={24} md={8}><Form.Item name="number" label="Номер накладной" rules={[{ required: true }]}><Input size="large" /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="type" label="Тип операции" rules={[{ required: true }]}><Select size="large" onChange={(v) => setInvoiceType(v)} options={[
              { label: 'Приход сырья и материалов', value: 'mixed_receipt' },
              { label: 'Расход сырья', value: 'raw_issue' },
              { label: 'Расход материалов', value: 'material_issue' },
              { label: 'Отгрузка ГП', value: 'finished_shipment' },
            ]} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="effective_at" label="Дата и время" rules={[{ required: true }]}><DatePicker showTime size="large" style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.List name="items">
            {(fields, { add, remove }) => <div className="recipe-lines">
              {fields.map((field) => {
                const type = watchedItems?.[field.name]?.item_type
                return <div key={field.key} className="invoice-line">
                  <Form.Item {...field} name={[field.name, 'item_type']} rules={[{ required: true }]}>
                    <Select disabled={invoiceType !== 'mixed_receipt'} options={[
                      { label: 'Сырьё', value: 'raw' }, { label: 'Материал', value: 'material' }, { label: 'ГП', value: 'finished', disabled: invoiceType !== 'finished_shipment' },
                    ]} />
                  </Form.Item>
                  <Form.Item {...field} name={[field.name, 'item_id']} rules={[{ required: true }]}>
                    <Select showSearch optionFilterProp="label" placeholder="Позиция" options={itemOptions(type)} />
                  </Form.Item>
                  <Form.Item {...field} name={[field.name, 'quantity']} rules={[{ required: true }]}>
                    <InputNumber min={0.0001} style={{ width: '100%' }} placeholder="Количество" />
                  </Form.Item>
                  <Button danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                </div>
              })}
              <Button icon={<PlusOutlined />} onClick={() => add({ item_type: invoiceType === 'material_issue' ? 'material' : invoiceType === 'finished_shipment' ? 'finished' : 'raw' })}>Добавить строку</Button>
            </div>}
          </Form.List>
        </Form>
      </Modal>
    </div>
  )
}
