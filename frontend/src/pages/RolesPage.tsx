import { useEffect, useState, useCallback } from 'react'
import {
  Table, Button, Modal, Form, Input, Space,
  Popconfirm, message, Tag, Checkbox, Typography, Divider
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SafetyCertificateOutlined, LockOutlined } from '@ant-design/icons'
import { api } from '../utils/api'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'

const { Text } = Typography

interface Permission { id: number; method: string; path: string }
interface Role { id: number; name: string; permissions: Permission[] }

const methodColors: Record<string, string> = {
  GET: 'green', POST: 'blue', PUT: 'orange', DELETE: 'red',
}

const sectionLabels: Record<string, string> = {
  nomenclature: 'Номенклатура',
  'finished-products': 'Готовая продукция',
  units: 'Единицы измерения',
  conversions: 'Коэффициенты',
  users: 'Пользователи',
  roles: 'Роли',
  audit: 'Журнал аудита',
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRole, setEditRole] = useState<Role | null>(null)
  const [selectedPerms, setSelectedPerms] = useState<number[]>([])
  const [form] = Form.useForm()

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: r }, { data: p }] = await Promise.all([
        api.get('/api/v1/roles'),
        api.get('/api/v1/permissions'),
      ])
      setRoles(r)
      setPermissions(p)
    } catch {
      message.error('Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const openCreate = () => { setEditRole(null); setSelectedPerms([]); form.resetFields(); setModalOpen(true) }
  const openEdit = (role: Role) => {
    setEditRole(role)
    form.setFieldsValue({ name: role.name })
    setSelectedPerms(role.permissions?.map((p) => p.id) || [])
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const body = { ...values, permission_ids: selectedPerms }
      if (editRole) {
        await api.put(`/api/v1/roles/${editRole.id}`, body)
        message.success('Роль обновлена')
      } else {
        await api.post('/api/v1/roles', body)
        message.success('Роль создана')
      }
      setModalOpen(false)
      fetchAll()
    } catch (e: any) {
      if (e?.response?.data?.error) message.error(e.response.data.error)
    }
  }

  const handleDelete = async (role: Role) => {
    try {
      await api.delete(`/api/v1/roles/${role.id}`)
      message.success('Роль удалена')
      fetchAll()
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'Ошибка')
    }
  }

  const groupedPerms = permissions.reduce((acc, p) => {
    const section = p.path.split('/')[3] || p.path
    if (!acc[section]) acc[section] = []
    acc[section].push(p)
    return acc
  }, {} as Record<string, Permission[]>)

  const togglePerm = (id: number) =>
    setSelectedPerms((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id])

  const toggleSection = (section: string) => {
    const ids = groupedPerms[section].map((p) => p.id)
    const allSelected = ids.every((id) => selectedPerms.includes(id))
    setSelectedPerms((prev) => allSelected ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])])
  }

  const columns = [
    {
      title: 'ID', dataIndex: 'id', width: 64,
      render: (v: number) => <span style={{ color: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'monospace' }}>#{v}</span>,
    },
    {
      title: 'Роль', dataIndex: 'name',
      render: (v: string) => (
        <Space>
          <SafetyCertificateOutlined style={{ color: 'var(--color-accent)' }} />
          <strong style={{ color: 'var(--color-text-primary)' }}>{v}</strong>
        </Space>
      ),
    },
    {
      title: 'Прав доступа', dataIndex: 'permissions',
      render: (perms: Permission[]) => (
        <Tag color={perms?.length > 0 ? 'blue' : 'default'}>
          {perms?.length || 0} разрешений
        </Tag>
      ),
    },
    {
      title: 'Разделы', dataIndex: 'permissions',
      render: (perms: Permission[]) => {
        if (!perms?.length) return <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>нет доступа</span>
        const sections = [...new Set(perms.map((p) => p.path.split('/')[3]))].filter(Boolean)
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {sections.slice(0, 4).map((s) => (
              <Tag key={s} style={{ fontSize: 10, margin: 0 }}>{sectionLabels[s] || s}</Tag>
            ))}
            {sections.length > 4 && <Tag style={{ fontSize: 10, margin: 0 }}>+{sections.length - 4}</Tag>}
          </div>
        )
      },
    },
    {
      title: '', key: 'actions', width: 100,
      render: (_: any, record: Role) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}
            style={{ color: 'var(--color-accent)', borderColor: 'var(--color-border)' }} />
          <Popconfirm
            title="Удалить роль?"
            description="Пользователи с этой ролью потеряют доступ"
            onConfirm={() => handleDelete(record)}
            okText="Удалить" cancelText="Отмена"
            okButtonProps={{ danger: true, size: 'middle' }}
          >
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Роли и права доступа"
        subtitle="Динамическая система RBAC — настройте разрешения для каждой роли"
        crumbs={[{ label: 'Администрирование' }, { label: 'Роли и права' }]}
        action={
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={openCreate}
            style={{ height: 48, paddingInline: 24, fontWeight: 600 }}>
            Создать роль
          </Button>
        }
      />

      {!loading && roles.length === 0 ? (
        <EmptyState
          title="Нет ролей"
          description="Создайте роли и назначьте права доступа к разделам"
          action={{ label: 'Создать первую роль', onClick: openCreate }}
        />
      ) : (
        <Table
          dataSource={roles} columns={columns} rowKey="id" loading={loading}
          size="middle" pagination={false}
          style={{ background: 'var(--color-surface)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--color-border)' }}
        />
      )}

      <Modal
        title={
          <Space>
            <LockOutlined style={{ color: 'var(--color-accent)' }} />
            {editRole ? `Редактировать: ${editRole.name}` : 'Новая роль'}
          </Space>
        }
        open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)}
        okText={editRole ? 'Сохранить' : 'Создать'} cancelText="Отмена" width={620}
        okButtonProps={{ size: 'large', style: { height: 48, fontWeight: 600 } }}
        cancelButtonProps={{ size: 'large', style: { height: 48 } }}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Название роли" rules={[{ required: true, message: 'Введите название' }]}>
            <Input size="large" placeholder="Кладовщик, Технолог, Мастер..." />
          </Form.Item>
        </Form>

        <Divider style={{ borderColor: 'var(--color-border)', margin: '12px 0' }}>
          <Text style={{ color: 'var(--color-text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Права доступа ({selectedPerms.length} выбрано)
          </Text>
        </Divider>

        <div style={{ maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
          {Object.entries(groupedPerms).map(([section, perms]) => {
            const sectionIds = perms.map((p) => p.id)
            const allChecked = sectionIds.every((id) => selectedPerms.includes(id))
            const someChecked = sectionIds.some((id) => selectedPerms.includes(id))
            return (
              <div key={section} style={{
                marginBottom: 8, background: 'var(--color-surface-2)',
                border: `1px solid ${allChecked ? 'rgba(22,119,255,0.3)' : 'var(--color-border)'}`,
                borderRadius: 8, overflow: 'hidden', transition: 'border-color 0.2s',
              }}>
                <div
                  onClick={() => toggleSection(section)}
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: allChecked ? 'rgba(22,119,255,0.06)' : 'transparent',
                  }}
                >
                  <Checkbox checked={allChecked} indeterminate={someChecked && !allChecked} />
                  <Text style={{ color: 'var(--color-text-primary)', fontWeight: 600, fontSize: 13 }}>
                    {sectionLabels[section] || section}
                  </Text>
                  <Text style={{ color: 'var(--color-text-muted)', fontSize: 11, marginLeft: 'auto' }}>
                    {sectionIds.filter((id) => selectedPerms.includes(id)).length}/{perms.length}
                  </Text>
                </div>
                <div style={{ padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {perms.map((perm) => (
                    <div
                      key={perm.id}
                      onClick={() => togglePerm(perm.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '5px 10px',
                        background: selectedPerms.includes(perm.id) ? 'rgba(22,119,255,0.1)' : 'var(--color-bg)',
                        border: `1px solid ${selectedPerms.includes(perm.id) ? 'rgba(22,119,255,0.35)' : 'var(--color-border)'}`,
                        borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <Checkbox checked={selectedPerms.includes(perm.id)} />
                      <Tag color={methodColors[perm.method] || 'default'} style={{ margin: 0, fontSize: 10, lineHeight: '16px', height: 18 }}>
                        {perm.method}
                      </Tag>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Modal>
    </div>
  )
}
