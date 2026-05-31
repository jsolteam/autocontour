import { useEffect, useState, useCallback } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, Space,
  Popconfirm, message, Tag, Alert
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons'
import { api } from '../utils/api'
import { useAuthStore } from '../store/authStore'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'

interface Role { id: number; name: string }
interface User { id: number; login: string; full_name: string; role: Role; role_id: number }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [form] = Form.useForm()
  const { user: currentUser } = useAuthStore()

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: u }, { data: r }] = await Promise.all([
        api.get('/api/v1/users'),
        api.get('/api/v1/roles'),
      ])
      setUsers(u)
      setRoles(r)
    } catch {
      message.error('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const openCreate = () => { setEditUser(null); form.resetFields(); setModalOpen(true) }
  const openEdit = (u: User) => {
    setEditUser(u)
    form.setFieldsValue({ login: u.login, full_name: u.full_name, role_id: u.role_id })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (editUser) {
        await api.put(`/api/v1/users/${editUser.id}`, values)
        message.success('Пользователь обновлён')
      } else {
        await api.post('/api/v1/users', values)
        message.success('Пользователь создан')
      }
      setModalOpen(false)
      fetchAll()
    } catch (e: any) {
      if (e?.response?.data?.error) message.error(e.response.data.error)
    }
  }

  const handleDelete = async (u: User) => {
    try {
      await api.delete(`/api/v1/users/${u.id}`)
      message.success('Пользователь удалён')
      fetchAll()
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'Ошибка удаления')
    }
  }

  const columns = [
    {
      title: 'ID', dataIndex: 'id', width: 64,
      render: (v: number) => <span style={{ color: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'monospace' }}>#{v}</span>,
    },
    {
      title: 'Логин', dataIndex: 'login',
      render: (v: string) => (
        <Space>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(22,119,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, color: 'var(--color-accent)',
          }}>
            <UserOutlined />
          </div>
          <strong style={{ color: 'var(--color-text-primary)' }}>{v}</strong>
        </Space>
      ),
    },
    {
      title: 'ФИО', dataIndex: 'full_name',
      render: (v: string) => <span style={{ color: v ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>{v || '—'}</span>,
    },
    {
      title: 'Роль', dataIndex: 'role',
      render: (role: Role) => (
        <Tag color={role?.name === 'Администратор' ? 'blue' : role?.name === 'Технолог' ? 'green' : 'default'}>
          {role?.name}
        </Tag>
      ),
    },
    {
      title: '', key: 'actions', width: 100,
      render: (_: any, record: User) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}
            style={{ color: 'var(--color-accent)', borderColor: 'var(--color-border)' }} />
          {record.id !== currentUser?.id && (
            <Popconfirm
              title="Удалить пользователя?"
              description="Пользователь потеряет доступ к системе"
              onConfirm={() => handleDelete(record)}
              okText="Удалить" cancelText="Отмена"
              okButtonProps={{ danger: true, size: 'middle' }}
            >
              <Button size="small" icon={<DeleteOutlined />} danger />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Пользователи"
        subtitle="Управление доступом к системе Авто-Контур"
        crumbs={[{ label: 'Администрирование' }, { label: 'Пользователи' }]}
        action={
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={openCreate}
            style={{ height: 48, paddingInline: 24, fontWeight: 600 }}>
            Добавить пользователя
          </Button>
        }
      />

      <Alert
        message="Регистрация через форму входа отключена. Только администратор может создавать пользователей."
        type="info" showIcon
        style={{ marginBottom: 16, background: 'rgba(22,119,255,0.06)', border: '1px solid rgba(22,119,255,0.2)' }}
      />

      {!loading && users.length === 0 ? (
        <EmptyState
          title="Нет пользователей"
          description="Добавьте первого пользователя системы"
          action={{ label: 'Создать пользователя', onClick: openCreate }}
        />
      ) : (
        <Table
          dataSource={users} columns={columns} rowKey="id" loading={loading}
          size="middle" pagination={false}
          style={{ background: 'var(--color-surface)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--color-border)' }}
        />
      )}

      <Modal
        title={editUser ? 'Редактировать пользователя' : 'Новый пользователь'}
        open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)}
        okText={editUser ? 'Сохранить' : 'Создать'} cancelText="Отмена" width={480}
        okButtonProps={{ size: 'large', style: { height: 48, fontWeight: 600 } }}
        cancelButtonProps={{ size: 'large', style: { height: 48 } }}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item name="login" label="Логин" rules={[{ required: true, message: 'Введите логин' }]}>
            <Input size="large" placeholder="ivanov" disabled={!!editUser} />
          </Form.Item>
          <Form.Item name="full_name" label="ФИО">
            <Input size="large" placeholder="Иванов Иван Иванович" />
          </Form.Item>
          <Form.Item name="role_id" label="Роль" rules={[{ required: true, message: 'Выберите роль' }]}>
            <Select size="large" showSearch optionFilterProp="label"
              placeholder="Выберите роль"
              options={roles.map((r) => ({ label: r.name, value: r.id }))} />
          </Form.Item>
          {!editUser ? (
            <Form.Item name="password" label="Пароль"
              rules={[{ required: true, message: 'Введите пароль' }, { min: 6, message: 'Минимум 6 символов' }]}>
              <Input.Password size="large" placeholder="Минимум 6 символов" />
            </Form.Item>
          ) : (
            <Form.Item name="password" label="Новый пароль" extra="Оставьте пустым, чтобы не менять">
              <Input.Password size="large" placeholder="Новый пароль (необязательно)" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}
