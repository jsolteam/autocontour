import { useCallback, useEffect, useState } from 'react'
import { Button, Form, InputNumber, message, Modal, Select, Table, Tag, Popconfirm, Row, Col } from 'antd'
import PageHeader from '../components/PageHeader'
import { api } from '../utils/api'

export default function ProductionPage() {
  const [recipes, setRecipes] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [packOpen, setPackOpen] = useState(false)
  const [form] = Form.useForm()
  const [packForm] = Form.useForm()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [recipesRes, plansRes] = await Promise.all([api.get('/api/v1/recipes'), api.get('/api/v1/production/plans')])
      setRecipes(recipesRes.data)
      setPlans(plansRes.data)
    } catch (e: any) { message.error(e?.response?.data?.error || 'Ошибка загрузки производства') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchData() }, [fetchData])

  const startPlan = async () => {
    try {
      const values = await form.validateFields()
      await api.post('/api/v1/production/initialize-plan', values)
      message.success('План запущен')
      setModalOpen(false)
      fetchData()
    } catch (e: any) { message.error(e?.response?.data?.error || 'Ошибка запуска плана') }
  }
  const completePlan = async (id: number) => {
    try { await api.post(`/api/v1/production/plans/${id}/complete`); message.success('План завершен'); fetchData() }
    catch (e: any) { message.error(e?.response?.data?.error || 'Ошибка завершения плана') }
  }

  const packPallets = async () => {
    try {
      const values = await packForm.validateFields()
      await api.post('/api/v1/production/pack-pallets', values)
      message.success('ГП упакована и перемещена на основной склад')
      setPackOpen(false)
      fetchData()
    } catch (e: any) { message.error(e?.response?.data?.error || 'Ошибка упаковки') }
  }

  return <div>
    <PageHeader title="Производство" subtitle="Запуск планов, контроль дефицитов и подтверждение выполнения" crumbs={[{ label: 'Производство' }]} action={<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Button size="large" onClick={() => { packForm.resetFields(); setPackOpen(true) }}>Упаковать в паллеты</Button><Button type="primary" size="large" onClick={() => { form.resetFields(); setModalOpen(true) }}>Запустить план</Button></div>} />
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <Table rowKey="id" loading={loading} dataSource={plans} scroll={{ x: true }} columns={[
          { title: 'ID', dataIndex: 'id' },
          { title: 'Рецепт', render: (_, r) => r.recipe?.name ?? '—' },
          { title: 'ГП', render: (_, r) => r.finished_product?.name ?? '—' },
          { title: 'Количество', render: (_, r) => `${r.target_quantity} шт` },
          { title: 'Статус', render: (_, r) => <Tag color={r.status === 'COMPLETED' ? 'success' : 'processing'}>{r.status === 'COMPLETED' ? 'Завершен' : 'В работе'}</Tag> },
          { title: '', render: (_, r) => r.status !== 'COMPLETED' && <Popconfirm title="Подтвердить завершение плана?" description="Будут списаны ресурсы со склада производства и начислена ГП" onConfirm={() => completePlan(r.id)} okText="Да" cancelText="Нет"><Button>Завершить</Button></Popconfirm> },
        ]} />
      </Col>
    </Row>
    <Modal title="Упаковка в паллеты" open={packOpen} onOk={packPallets} onCancel={() => setPackOpen(false)} okText="Упаковать" cancelText="Отмена">
      <Form form={packForm} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="finished_product_id" label="Готовая продукция" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={recipes.map((r) => r.finished_product).filter(Boolean).map((p) => ({ label: p.name, value: p.id }))} /></Form.Item>
        <Form.Item name="pallets" label="Количество паллет" rules={[{ required: true }]}><InputNumber min={0.0001} style={{ width: '100%' }} /></Form.Item>
      </Form>
    </Modal>
    <Modal title="Запуск производственного плана" open={modalOpen} onOk={startPlan} onCancel={() => setModalOpen(false)} okText="Старт" cancelText="Отмена">
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="recipe_id" label="Рецепт" rules={[{ required: true, message: 'Выберите рецепт' }]}><Select showSearch optionFilterProp="label" options={recipes.map((r) => ({ label: `${r.name} — ${r.finished_product?.name ?? ''}`, value: r.id }))} /></Form.Item>
        <Form.Item name="target_quantity" label="Плановое количество, шт" rules={[{ required: true, message: 'Укажите количество' }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
      </Form>
    </Modal>
  </div>
}
