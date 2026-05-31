import { useEffect, useState, useCallback } from 'react'
import { Table, Select, DatePicker, Space, Button, Typography, Tag, Tooltip } from 'antd'
import { ReloadOutlined, FilterOutlined, ClearOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { api } from '../utils/api'
import PageHeader from '../components/PageHeader'

dayjs.locale('ru')
const { Text } = Typography
const { RangePicker } = DatePicker

interface LogEntry {
  id: number
  user_id: number
  user: { id: number; login: string; full_name: string }
  action: string
  details: string
  created_at: string
}

const actionColors: Record<string, string> = {
  'Создание': 'green', 'Изменение': 'blue', 'Удаление': 'red',
  'Вход': 'cyan', 'Запуск': 'orange', 'Подтверждение': 'purple',
}

export default function AuditPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<number | null>(null)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  useEffect(() => {
    api.get('/api/v1/users').then(({ data }) => setUsers(data)).catch(() => {})
  }, [])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (selectedUser) params.user_id = selectedUser
      if (dateRange) { params.from = dateRange[0].startOf('day').toISOString(); params.to = dateRange[1].endOf('day').toISOString() }
      const { data } = await api.get('/api/v1/audit', { params })
      setLogs(data)
    } catch {
    } finally {
      setLoading(false)
    }
  }, [selectedUser, dateRange])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const clearFilters = () => { setSelectedUser(null); setDateRange(null) }
  const hasFilters = selectedUser !== null || dateRange !== null

  const columns = [
    {
      title: 'Дата / время',
      dataIndex: 'created_at',
      width: 155,
      render: (v: string) => (
        <div>
          <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--color-text-primary)' }}>
            {dayjs(v).format('DD.MM.YYYY')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            {dayjs(v).format('HH:mm:ss')}
          </div>
        </div>
      ),
    },
    {
      title: 'Пользователь',
      dataIndex: 'user',
      width: 180,
      render: (user: any) => (
        <div>
          <div style={{ fontWeight: 500, color: 'var(--color-text-primary)', fontSize: 13 }}>
            {user?.full_name || user?.login || `#${user?.id}`}
          </div>
          {user?.full_name && (
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{user?.login}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Действие',
      dataIndex: 'action',
      width: 200,
      render: (action: string) => {
        const type = Object.keys(actionColors).find((k) => action.startsWith(k))
        return <Tag color={type ? actionColors[type] : 'default'} style={{ fontSize: 12 }}>{action}</Tag>
      },
    },
    {
      title: 'Детали',
      dataIndex: 'details',
      render: (v: string) => (
        <Text style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{v}</Text>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Журнал действий"
        subtitle="Полный аудит всех операций в системе с указанием пользователя и времени"
        crumbs={[{ label: 'Администрирование' }, { label: 'Журнал действий' }]}
      />

      {/* Filter bar */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        padding: '14px 20px',
        marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <FilterOutlined style={{ color: 'var(--color-text-muted)' }} />
        <Select
          style={{ width: 220 }}
          placeholder="Все пользователи"
          allowClear
          value={selectedUser}
          onChange={(v) => setSelectedUser(v)}
          options={users.map((u) => ({ label: u.full_name || u.login, value: u.id }))}
        />
        <RangePicker
          value={dateRange}
          onChange={(v) => setDateRange(v as any)}
          format="DD.MM.YYYY"
          placeholder={['Дата от', 'Дата до']}
        />
        <Space.Compact>
          <Button icon={<ReloadOutlined />} onClick={fetchLogs} loading={loading}>
            Обновить
          </Button>
          {hasFilters && (
            <Tooltip title="Сбросить фильтры">
              <Button icon={<ClearOutlined />} onClick={clearFilters} />
            </Tooltip>
          )}
        </Space.Compact>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
          {hasFilters && <Tag color="blue">Фильтр активен</Tag>}
          <Text style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
            Найдено: <strong style={{ color: 'var(--color-text-primary)' }}>{logs.length}</strong> записей
          </Text>
        </div>
      </div>

      <Table
        dataSource={logs}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 50, showSizeChanger: false, showTotal: (t) => `Всего ${t} записей` }}
        locale={{ emptyText: hasFilters ? 'Нет записей по фильтру' : 'Журнал пуст' }}
        scroll={{ x: 700 }}
        style={{ background: 'var(--color-surface)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--color-border)' }}
      />
    </div>
  )
}
