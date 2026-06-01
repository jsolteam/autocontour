import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Button, Form, Input, InputNumber, message, Modal, Popconfirm,
  Select, Space, Table, Tag, Typography, Row, Col,
} from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined, ExperimentOutlined } from '@ant-design/icons'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { api } from '../utils/api'

const { Text } = Typography

interface Unit { id: number; name: string }
interface FinishedProduct { id: number; name: string }
interface RawMaterial { id: number; name: string; base_unit?: Unit }
interface ProductionMaterial { id: number; name: string; base_unit?: Unit; capacity_value?: number | null; capacity_unit?: Unit | null }
interface RecipeRawLine { raw_material_id: number; quantity: number; unit_id?: number; raw_material?: RawMaterial; unit?: Unit }
interface RecipeMaterialLine { production_material_id: number; quantity: number; production_material?: ProductionMaterial }
interface Recipe {
  id: number
  name: string
  finished_product_id: number
  finished_product?: FinishedProduct
  output_quantity: number
  output_unit_id?: number
  output_unit?: Unit
  raw_items: RecipeRawLine[]
  material_items: RecipeMaterialLine[]
}

const emptyRawLine = (): RecipeRawLine => ({ raw_material_id: 0, quantity: 1 })
const emptyMaterialLine = (): RecipeMaterialLine => ({ production_material_id: 0, quantity: 1 })

export default function RecipesPage() {
  const [form] = Form.useForm()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [finishedProducts, setFinishedProducts] = useState<FinishedProduct[]>([])
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [materials, setMaterials] = useState<ProductionMaterial[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [rawLines, setRawLines] = useState<RecipeRawLine[]>([emptyRawLine()])
  const [materialLines, setMaterialLines] = useState<RecipeMaterialLine[]>([emptyMaterialLine()])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<Recipe | null>(null)
  const proportionConfirmOpen = useRef(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [recipesRes, productsRes, rawRes, materialsRes, unitsRes] = await Promise.all([
        api.get('/api/v1/recipes'),
        api.get('/api/v1/finished-products'),
        api.get('/api/v1/raw-materials'),
        api.get('/api/v1/materials'),
        api.get('/api/v1/units'),
      ])
      setRecipes(recipesRes.data)
      setFinishedProducts(productsRes.data)
      setRawMaterials(rawRes.data)
      setMaterials(materialsRes.data)
      setUnits(unitsRes.data)
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'Ошибка загрузки рецептов')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const rawByID = useMemo(() => new Map(rawMaterials.map((item) => [item.id, item])), [rawMaterials])
  const materialByID = useMemo(() => new Map(materials.map((item) => [item.id, item])), [materials])

  const openCreate = () => {
    setEditRecord(null)
    form.resetFields()
    setRawLines([emptyRawLine()])
    setMaterialLines([emptyMaterialLine()])
    setModalOpen(true)
  }

  const openEdit = (record: Recipe) => {
    setEditRecord(record)
    form.setFieldsValue({
      name: record.name,
      finished_product_id: record.finished_product_id,
      output_quantity: record.output_quantity,
      output_unit_id: record.output_unit_id,
    })
    setRawLines(record.raw_items?.map((line) => ({ raw_material_id: line.raw_material_id, quantity: line.quantity, unit_id: line.unit_id })) || [emptyRawLine()])
    setMaterialLines(record.material_items?.map((line) => ({ production_material_id: line.production_material_id, quantity: line.quantity })) || [emptyMaterialLine()])
    setModalOpen(true)
  }

  const updateRawLine = (index: number, patch: Partial<RecipeRawLine>) => {
    if (patch.quantity !== undefined) {
      const current = rawLines[index]
      const oldQuantity = Number(current?.quantity || 0)
      const nextQuantity = Number(patch.quantity || 0)
      if (oldQuantity > 0 && nextQuantity > 0 && rawLines.length > 1 && !proportionConfirmOpen.current) {
        proportionConfirmOpen.current = true
        Modal.confirm({
          title: 'Нужно ли изменить пропорции?',
          content: 'Количество одной позиции изменилось. Пересчитать остальные компоненты по текущей пропорции?',
          okText: 'Да, пересчитать',
          cancelText: 'Нет',
          onOk: () => {
            const factor = nextQuantity / oldQuantity
            setRawLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : { ...line, quantity: Number((line.quantity * factor).toFixed(4)) })))
            proportionConfirmOpen.current = false
          },
          onCancel: () => {
            setRawLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)))
            proportionConfirmOpen.current = false
          },
        })
        return
      }
    }
    setRawLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }

  const updateMaterialLine = (index: number, patch: Partial<RecipeMaterialLine>) => {
    setMaterialLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }

  const validateLines = () => {
    if (rawLines.length === 0 || rawLines.some((line) => !line.raw_material_id || line.quantity <= 0)) {
      message.error('Заполните все строки сырья и укажите положительные количества')
      return false
    }
    if (materialLines.length === 0 || materialLines.some((line) => !line.production_material_id || line.quantity <= 0)) {
      message.error('Заполните все строки материалов и укажите положительные количества')
      return false
    }
    return true
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (!validateLines()) return
      const payload = {
        ...values,
        raw_items: rawLines.map(({ raw_material_id, quantity, unit_id }) => ({ raw_material_id, quantity, unit_id })),
        material_items: materialLines.map(({ production_material_id, quantity }) => ({ production_material_id, quantity })),
      }
      if (editRecord) {
        await api.put(`/api/v1/recipes/${editRecord.id}`, payload)
        message.success('Рецепт обновлён')
      } else {
        await api.post('/api/v1/recipes', payload)
        message.success('Рецепт создан')
      }
      setModalOpen(false)
      fetchAll()
    } catch (e: any) {
      if (e?.response?.data?.error) message.error(e.response.data.error)
    }
  }

  const handleDelete = async (record: Recipe) => {
    try {
      await api.delete(`/api/v1/recipes/${record.id}`)
      message.success('Рецепт удалён')
      fetchAll()
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'Ошибка удаления')
    }
  }

  const totalLiquidLiters = rawLines.reduce((sum, line) => {
    const raw = rawByID.get(line.raw_material_id)
    return (units.find((u) => u.id === (line.unit_id || raw?.base_unit?.id))?.name === 'л' || raw?.base_unit?.name === 'л') ? sum + Number(line.quantity || 0) : sum
  }, 0)
  const outputQuantity = Number(Form.useWatch('output_quantity', form) || 0)
  const volumePerUnit = outputQuantity > 0 ? totalLiquidLiters / outputQuantity : 0

  const columns = [
    { title: 'Название', dataIndex: 'name' },
    { title: 'ГП', render: (_: any, row: Recipe) => row.finished_product?.name ?? '—' },
    { title: 'Выход', render: (_: any, row: Recipe) => <Tag color="blue">{row.output_quantity} шт</Tag> },
    { title: 'Сырьё', render: (_: any, row: Recipe) => row.raw_items?.length || 0 },
    { title: 'Материалы', render: (_: any, row: Recipe) => row.material_items?.length || 0 },
    {
      title: '', key: 'actions', width: 100,
      render: (_: any, record: Recipe) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="Удалить рецепт?" onConfirm={() => handleDelete(record)} okText="Удалить" cancelText="Отмена">
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Конструктор рецептов"
        subtitle="Технологические карты с количествами, единицами измерения и материалами"
        crumbs={[{ label: 'Производство' }, { label: 'Рецепты' }]}
        action={(
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={openCreate} style={{ height: 48, fontWeight: 600 }}>
            Создать рецепт
          </Button>
        )}
      />

      {!loading && recipes.length === 0 ? (
        <EmptyState
          title="Нет рецептов"
          description="Создайте первую технологическую карту для готовой продукции"
          action={{ label: 'Создать рецепт', onClick: openCreate }}
        />
      ) : (
        <>
          <div className="desktop-table">
            <Table
              dataSource={recipes}
              columns={columns}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (t) => `Всего: ${t}` }}
              scroll={{ x: true }}
              style={{ background: 'var(--color-surface)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--color-border)' }}
            />
          </div>
          <div className="mobile-cards" style={{ flexDirection: 'column', display: 'none' }}>
            {recipes.map((recipe) => (
              <div key={recipe.id} className="mobile-card-item">
                <div className="item-name">{recipe.name}</div>
                <div className="item-detail">ГП: {recipe.finished_product?.name ?? '—'}</div>
                <div className="item-detail">Выход: {recipe.output_quantity} шт</div>
                <div className="item-detail">Сырьё: {recipe.raw_items?.length || 0} поз.</div>
                <div className="item-detail">Материалы: {recipe.material_items?.length || 0} поз.</div>
                <div className="item-actions">
                  <Button icon={<EditOutlined />} onClick={() => openEdit(recipe)} style={{ flex: 1, height: 48 }}>Изменить</Button>
                  <Popconfirm title="Удалить?" onConfirm={() => handleDelete(recipe)} okText="Да" cancelText="Нет">
                    <Button danger icon={<DeleteOutlined />} style={{ height: 48, width: 48 }} />
                  </Popconfirm>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal
        title={
          <Space>
            <ExperimentOutlined style={{ color: 'var(--color-accent)' }} />
            {editRecord ? `Редактировать: ${editRecord.name}` : 'Новый рецепт'}
          </Space>
        }
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText={editRecord ? 'Сохранить' : 'Создать'}
        cancelText="Отмена"
        width={980}
        okButtonProps={{ size: 'large', style: { height: 48, fontWeight: 600 } }}
        cancelButtonProps={{ size: 'large', style: { height: 48 } }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 18 }}>
          <Row gutter={[16, 0]}>
            <Col xs={24} md={10}>
              <Form.Item name="name" label="Название рецепта" rules={[{ required: true, message: 'Введите название рецепта' }]}>
                <Input size="large" placeholder="Например: Гель Ариэль 1л" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="finished_product_id" label="Готовая продукция" rules={[{ required: true, message: 'Выберите ГП' }]}>
                <Select
                  size="large"
                  showSearch
                  optionFilterProp="label"
                  placeholder="Выберите ГП"
                  options={finishedProducts.map((product) => ({ label: product.name, value: product.id }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={3}>
              <Form.Item name="output_quantity" label="Выход" rules={[{ required: true, message: 'Укажите выход' }]}>
                <InputNumber size="large" style={{ width: '100%' }} min={1} step={1} />
              </Form.Item>
            </Col>
            <Col xs={24} md={3}>
              <Form.Item name="output_unit_id" label="ЕИ выхода">
                <Select size="large" allowClear showSearch optionFilterProp="label" placeholder="ЕИ" options={units.map((u) => ({ label: u.name, value: u.id }))} />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        <div className="recipe-summary">
          <Tag color="cyan">Жидкое сырьё: {totalLiquidLiters || 0} л</Tag>
          <Tag color="processing">На 1 шт: {volumePerUnit ? volumePerUnit.toFixed(4) : '—'} л</Tag>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <div className="recipe-block recipe-block--raw">
              <div className="recipe-block__header">
                <div>
                  <div className="recipe-block__title">Необходимое сырьё</div>
                  <Text type="secondary">Выберите позиции, количество и единицу измерения.</Text>
                </div>
                <Button onClick={() => setRawLines((prev) => [...prev, emptyRawLine()])}>Добавить</Button>
              </div>
              <div className="recipe-lines">
                {rawLines.map((line, index) => {
                  const selected = rawByID.get(line.raw_material_id)
                  return (
                    <div key={index} className="recipe-line">
                      <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder="Выберите сырьё"
                        value={line.raw_material_id || undefined}
                        options={rawMaterials.map((item) => ({ label: item.name, value: item.id }))}
                        onChange={(value) => updateRawLine(index, { raw_material_id: value })}
                      />
                      <InputNumber
                        min={0.0001}
                        step={0.1}
                        value={line.quantity}
                        onChange={(value) => updateRawLine(index, { quantity: Number(value || 0) })}
                        addonAfter={units.find((u) => u.id === (line.unit_id || selected?.base_unit?.id))?.name ?? 'ЕИ'}
                      />
                      <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder="ЕИ строки"
                        value={line.unit_id || selected?.base_unit?.id}
                        options={units.map((u) => ({ label: u.name, value: u.id }))}
                        onChange={(value) => updateRawLine(index, { unit_id: value })}
                      />
                      <Button danger icon={<DeleteOutlined />} onClick={() => setRawLines((prev) => prev.filter((_, i) => i !== index))} />
                    </div>
                  )
                })}
              </div>
            </div>
          </Col>
          <Col xs={24} lg={12}>
            <div className="recipe-block recipe-block--materials">
              <div className="recipe-block__header">
                <div>
                  <div className="recipe-block__title">Необходимые материалы</div>
                  <Text type="secondary">Выберите необходимые позиции из справочника материалов.</Text>
                </div>
                <Button onClick={() => setMaterialLines((prev) => [...prev, emptyMaterialLine()])}>Добавить</Button>
              </div>
              <div className="recipe-lines">
                {materialLines.map((line, index) => {
                  const selected = materialByID.get(line.production_material_id)
                  const capacity = selected?.capacity_value && selected?.capacity_unit
                    ? `${selected.capacity_value} ${selected.capacity_unit.name}`
                    : null
                  return (
                    <div key={index} className="recipe-line recipe-line--material">
                      <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder="Выберите материал"
                        value={line.production_material_id || undefined}
                        options={materials.map((item) => ({
                          label: item.capacity_value && item.capacity_unit ? `${item.name} (${item.capacity_value} ${item.capacity_unit.name})` : item.name,
                          value: item.id,
                        }))}
                        onChange={(value) => updateMaterialLine(index, { production_material_id: value })}
                      />
                      <InputNumber
                        min={0.0001}
                        step={1}
                        value={line.quantity}
                        onChange={(value) => updateMaterialLine(index, { quantity: Number(value || 0) })}
                        addonAfter={selected?.base_unit?.name ?? 'ЕИ'}
                      />
                      <Button danger icon={<DeleteOutlined />} onClick={() => setMaterialLines((prev) => prev.filter((_, i) => i !== index))} />
                      {capacity && <Tag color="blue" className="recipe-capacity-tag">Вместимость: {capacity}</Tag>}
                    </div>
                  )
                })}
              </div>
            </div>
          </Col>
        </Row>
      </Modal>
    </div>
  )
}
