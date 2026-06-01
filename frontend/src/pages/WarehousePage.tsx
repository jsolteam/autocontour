import { useEffect, useState, useCallback } from 'react'
import { Row, Col, Typography, Tag, Button, Table, InputNumber, Input, Modal, Form, Select, message, DatePicker, Popconfirm } from 'antd'
import { InboxOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { labelInvoiceType, labelStatus, statusColors } from '../utils/labels'
import PageHeader from '../components/PageHeader'
import { api } from '../utils/api'
import dayjs from 'dayjs'

const { Text } = Typography

type InvoiceKind = 'mixed_receipt' | 'raw_issue' | 'material_issue' | 'finished_shipment'
type TransferItemKind = 'raw' | 'material' | 'finished'

export default function WarehousePage() {
  const [rawStock, setRawStock] = useState<any[]>([])
  const [materialStock, setMaterialStock] = useState<any[]>([])
  const [productionRawStock, setProductionRawStock] = useState<any[]>([])
  const [productionMaterialStock, setProductionMaterialStock] = useState<any[]>([])
  const [productionFinishedStock, setProductionFinishedStock] = useState<any[]>([])
  const [mainFinishedStock, setMainFinishedStock] = useState<any[]>([])
  const [rawMaterials, setRawMaterials] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [finishedProducts, setFinishedProducts] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [invoiceType, setInvoiceType] = useState<InvoiceKind>('mixed_receipt')
  const [form] = Form.useForm()
  const [transferForm] = Form.useForm()
  const watchedTransferType = Form.useWatch('item_type', transferForm) as TransferItemKind | undefined
  const watchedItems = Form.useWatch('items', form) || []

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [rawStockRes, materialStockRes, prodRawRes, prodMaterialRes, prodFinishedRes, mainFinishedRes, rawRes, materialsRes, fpRes, unitsRes, invoicesRes] = await Promise.all([
        api.get('/api/v1/main-stock/raw'),
        api.get('/api/v1/main-stock/materials'),
        api.get('/api/v1/production-stock/raw'),
        api.get('/api/v1/production-stock/materials'),
        api.get('/api/v1/production-stock/finished'),
        api.get('/api/v1/main-stock/finished'),
        api.get('/api/v1/raw-materials'),
        api.get('/api/v1/materials'),
        api.get('/api/v1/finished-products'),
        api.get('/api/v1/units'),
        api.get('/api/v1/invoices'),
      ])
      setRawStock(rawStockRes.data)
      setMaterialStock(materialStockRes.data)
      setProductionRawStock(prodRawRes.data)
      setProductionMaterialStock(prodMaterialRes.data)
      setProductionFinishedStock(prodFinishedRes.data)
      setMainFinishedStock(mainFinishedRes.data)
      setRawMaterials(rawRes.data)
      setMaterials(materialsRes.data)
      setFinishedProducts(fpRes.data)
      setUnits(unitsRes.data)
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
    const operationNumber = (type === 'raw_issue' || type === 'material_issue') ? `ОП-${dayjs().format('YYYYMMDD-HHmmss')}` : undefined
    form.setFieldsValue({ number: operationNumber, type, effective_at: dayjs(), items: [{ item_type: type === 'material_issue' ? 'material' : type === 'raw_issue' ? 'raw' : type === 'finished_shipment' ? 'finished' : 'raw' }] })
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
      message.success('Операция создана и ожидает подтверждения')
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


  const openTransfer = (itemType: TransferItemKind = 'raw') => {
    transferForm.resetFields()
    transferForm.setFieldsValue({ item_type: itemType, direction: 'main_to_production', quantity: 1 })
    setTransferOpen(true)
  }

  const saveTransfer = async () => {
    try {
      const values = await transferForm.validateFields()
      await api.post('/api/v1/stock/transfers', values)
      message.success('Перемещение выполнено')
      setTransferOpen(false)
      fetchData()
    } catch (e: any) {
      if (e?.response?.data?.error) message.error(e.response.data.error)
    }
  }

  const transferBalanceHint = (type?: TransferItemKind) => {
    if (type === 'raw') return `Основной склад: ${rawStock.length} поз.; производство: ${productionRawStock.length} поз.`
    if (type === 'material') return `Основной склад: ${materialStock.length} поз.; производство: ${productionMaterialStock.length} поз.`
    if (type === 'finished') return `Склад ГП: ${mainFinishedStock.length} поз.; производство: ${productionFinishedStock.length} поз.`
    return 'Выберите тип позиции'
  }

  const itemOptions = (type: string) => {
    if (type === 'raw') return rawMaterials.map((item) => ({ label: item.name, value: item.id }))
    if (type === 'material') return materials.map((item) => ({ label: item.name, value: item.id }))
    return finishedProducts.map((item) => ({ label: item.name, value: item.id }))
  }

  return (
    <div>
      <PageHeader
        title="Складские операции"
        subtitle="Оформление приходов, расходов и отгрузок. Для расходов используется номер операции без накладной."
        crumbs={[{ label: 'Склад' }]}
        badge={<Tag color="processing">Двухэтапное подтверждение</Tag>}
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={24} md={6}><Button block type="primary" size="large" onClick={() => openInvoice('mixed_receipt')}>Приход сырья/материалов</Button></Col>
        <Col xs={24} md={6}><Button block size="large" onClick={() => openInvoice('raw_issue')}>Расход сырья</Button></Col>
        <Col xs={24} md={6}><Button block size="large" onClick={() => openInvoice('material_issue')}>Расход материалов</Button></Col>
        <Col xs={24} md={6}><Button block danger size="large" onClick={() => openInvoice('finished_shipment')}>Отгрузка ГП</Button></Col>
        <Col xs={24}><Button block size="large" onClick={() => openTransfer('raw')}>Ручное перемещение между складами</Button></Col>
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
          { title: 'Тип', render: (_, row) => labelInvoiceType(row.type) },
          { title: 'Дата операции', render: (_, row) => row.effective_at ? new Date(row.effective_at).toLocaleString('ru-RU') : '—' },
          { title: 'Статус', render: (_, row) => <Tag color={statusColors[row.status]}>{labelStatus(row.status)}</Tag> },
          { title: 'Позиций', render: (_, row) => row.items?.length || 0 },
          { title: '', render: (_, row) => row.status === 'PENDING' && <Popconfirm title="Подтвердить операцию?" description="Это изменит остатки на складах" onConfirm={() => confirmInvoice(row.id)} okText="Да" cancelText="Нет"><Button>Подтвердить</Button></Popconfirm> },
        ]} />
      </div>

      <Modal title="Складская операция" open={modalOpen} onOk={saveInvoice} onCancel={() => setModalOpen(false)} okText="Создать на подтверждение" cancelText="Отмена" width={860}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col xs={24} md={8}><Form.Item name="number" label={invoiceType === 'raw_issue' || invoiceType === 'material_issue' ? 'Номер операции' : 'Номер накладной'} rules={[{ required: true }]}><Input size="large" disabled={invoiceType === 'raw_issue' || invoiceType === 'material_issue'} /></Form.Item></Col>
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
                    <InputNumber min={0.0001} style={{ width: '100%' }} placeholder={invoiceType === 'finished_shipment' ? 'Паллеты' : 'Количество'} />
                  </Form.Item>
                  <Button danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                </div>
              })}
              <Button icon={<PlusOutlined />} onClick={() => add({ item_type: invoiceType === 'material_issue' ? 'material' : invoiceType === 'finished_shipment' ? 'finished' : 'raw' })}>Добавить строку</Button>
            </div>}
          </Form.List>
        </Form>
      </Modal>

      <Modal title="Ручное перемещение между складами" open={transferOpen} onOk={saveTransfer} onCancel={() => setTransferOpen(false)} okText="Переместить" cancelText="Отмена" width={720}>
        <Form form={transferForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={12}>
            <Col xs={24} md={8}><Form.Item name="item_type" label="Тип позиции" rules={[{ required: true }]}><Select options={[{ label: 'Сырьё', value: 'raw' }, { label: 'Материал', value: 'material' }, { label: 'ГП (паллеты)', value: 'finished' }]} /></Form.Item></Col>
            <Col xs={24} md={16}><Form.Item name="direction" label="Направление" rules={[{ required: true }]}><Select options={[{ label: 'Основной склад → производство', value: 'main_to_production' }, { label: 'Производство → основной склад', value: 'production_to_main' }]} /></Form.Item></Col>
          </Row>
          <Text type="secondary">{transferBalanceHint(watchedTransferType)}</Text>
          <Row gutter={12} style={{ marginTop: 12 }}>
            <Col xs={24} md={12}><Form.Item name="item_id" label="Позиция" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" placeholder="Позиция" options={itemOptions(watchedTransferType || 'raw')} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="quantity" label={watchedTransferType === 'finished' ? 'Паллеты' : 'Количество'} rules={[{ required: true }]}><InputNumber min={0.0001} style={{ width: '100%' }} /></Form.Item></Col>
            {watchedTransferType === 'raw' && <Col xs={24} md={6}><Form.Item name="unit_id" label="ЕИ производства"><Select allowClear showSearch optionFilterProp="label" placeholder="Базовая" options={units.map((u) => ({ label: u.name, value: u.id }))} /></Form.Item></Col>}
          </Row>
        </Form>
      </Modal>
    </div>
  )
}
