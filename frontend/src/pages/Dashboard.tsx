import React, { useEffect, useState } from 'react'
import { Row, Col, Typography, Tag, Button, Skeleton, Timeline, Table, Popconfirm, message } from 'antd'
import {
  AppstoreOutlined, InboxOutlined, TeamOutlined, AuditOutlined,
  ShopOutlined, RightOutlined, ExperimentOutlined, FileTextOutlined, TableOutlined, CheckSquareOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'
import { api } from '../utils/api'
import { labelInvoiceType, labelStatus, statusColors } from '../utils/labels'
import StatCard from '../components/StatCard'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
dayjs.locale('ru')

const { Text } = Typography

interface Stats {
  nomenclature: number
  finished_products: number
  recipes: number
  pending_invoices: number
  active_plans: number
  users: number
}
interface AuditEntry { id: number; action: string; details: string; created_at: string; user: { login: string; full_name: string } }

const quickLinks: { icon: React.ReactNode; title: string; subtitle: string; path: string; color: string; stat: keyof Stats | null }[] = [
  { icon: <InboxOutlined />, title: 'Складские операции', subtitle: 'Приходы, расходы и отгрузки', path: '/warehouse', color: '#fa8c16', stat: 'pending_invoices' },
  { icon: <CheckSquareOutlined />, title: 'Бизнес-процессы', subtitle: 'Запуск и завершение планов', path: '/production', color: '#eb2f96', stat: 'active_plans' },
  { icon: <TableOutlined />, title: 'Основные таблицы', subtitle: 'Остатки и движения', path: '/stock-tables/raw', color: '#1677ff', stat: null },
  { icon: <FileTextOutlined />, title: 'Отчеты', subtitle: 'Приходы и остатки', path: '/reports', color: '#13c2c2', stat: null },
  { icon: <ExperimentOutlined />, title: 'Рецепты', subtitle: 'Технологические карты', path: '/recipes', color: '#722ed1', stat: 'recipes' },
  { icon: <AppstoreOutlined />, title: 'Номенклатура', subtitle: 'Справочники позиций', path: '/nomenclature', color: '#52c41a', stat: 'nomenclature' },
]
const adminLinks = [
  { icon: <TeamOutlined />, title: 'Пользователи', subtitle: 'Управление доступом', path: '/users', color: '#faad14', stat: 'users' as keyof Stats },
  { icon: <AuditOutlined />, title: 'Журнал действий', subtitle: 'История операций', path: '/audit', color: '#722ed1', stat: null },
]
const actionColors: Record<string, string> = { 'Создание': '#52c41a', 'Изменение': '#1677ff', 'Удаление': '#ff4d4f', 'Вход': '#13c2c2', 'Запуск': '#fa8c16', 'Подтверждение': '#52c41a' }

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, isAdmin } = useAuthStore()
  const companyName = useSettingsStore((s) => s.companyName)
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentLogs, setRecentLogs] = useState<AuditEntry[]>([])
  const [pendingItems, setPendingItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [raw, materials, fp, recipes, users, logs, invoices, plans] = await Promise.allSettled([
        api.get('/api/v1/raw-materials'), api.get('/api/v1/materials'), api.get('/api/v1/finished-products'), api.get('/api/v1/recipes'),
        api.get('/api/v1/users'), api.get('/api/v1/audit'), api.get('/api/v1/invoices', { params: { status: 'PENDING' } }), api.get('/api/v1/production/plans', { params: { status: 'IN_PROGRESS' } }),
      ])
      const pendingInvoices = invoices.status === 'fulfilled' ? invoices.value.data.map((item: any) => ({ ...item, pending_kind: 'invoice' })) : []
      const pendingPlans = plans.status === 'fulfilled' ? plans.value.data.map((item: any) => ({ ...item, pending_kind: 'plan' })) : []
      const pending = [...pendingInvoices, ...pendingPlans]
      setPendingItems(pending)
      setStats({
        nomenclature: (raw.status === 'fulfilled' ? raw.value.data.length : 0) + (materials.status === 'fulfilled' ? materials.value.data.length : 0),
        finished_products: fp.status === 'fulfilled' ? fp.value.data.length : 0,
        recipes: recipes.status === 'fulfilled' ? recipes.value.data.length : 0,
        pending_invoices: pending.length,
        active_plans: pendingPlans.length,
        users: users.status === 'fulfilled' ? users.value.data.length : 0,
      })
      if (logs.status === 'fulfilled') setRecentLogs(logs.value.data.slice(0, 8))
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  const confirmInvoice = async (id: number) => {
    try { await api.post(`/api/v1/invoices/${id}/confirm`); message.success('Операция подтверждена'); fetchAll() }
    catch (e: any) { message.error(e?.response?.data?.error || 'Ошибка подтверждения') }
  }
  const completePlan = async (id: number) => {
    try { await api.post(`/api/v1/production/plans/${id}/complete`); message.success('План завершен'); fetchAll() }
    catch (e: any) { message.error(e?.response?.data?.error || 'Ошибка завершения плана') }
  }
  const cancelPending = async (row: any) => {
    try {
      await api.post(row.pending_kind === 'invoice' ? `/api/v1/invoices/${row.id}/cancel` : `/api/v1/production/plans/${row.id}/cancel`)
      message.success('Ожидание отменено')
      fetchAll()
    } catch (e: any) { message.error(e?.response?.data?.error || 'Ошибка отмены') }
  }

  const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = dayjs().format('dddd, D MMMM YYYY')
  const statCards = [
    { label: 'Номенклатура', key: 'nomenclature', icon: <AppstoreOutlined />, color: '#1677ff', path: '/nomenclature' },
    { label: 'Готовая продукция', key: 'finished_products', icon: <ShopOutlined />, color: '#52c41a', path: '/finished-products' },
    { label: 'Рецепты', key: 'recipes', icon: <ExperimentOutlined />, color: '#722ed1', path: '/recipes' },
    { label: 'Ожидают подтверждения', key: 'pending_invoices', icon: <InboxOutlined />, color: '#fa8c16', path: '/dashboard' },
    { label: 'Планы в работе', key: 'active_plans', icon: <CheckSquareOutlined />, color: '#eb2f96', path: '/production' },
    ...(isAdmin() ? [{ label: 'Пользователи', key: 'users', icon: <TeamOutlined />, color: '#faad14', path: '/users' }] : []),
  ]

  return (
    <div>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '24px 28px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>Добро пожаловать, {user?.full_name?.split(' ')[0] || user?.login}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Tag color="blue">{user?.role}</Tag><Text style={{ color: 'var(--color-text-muted)' }}>{companyName} · ERP AutoContour</Text></div>
        </div>
        <div style={{ textAlign: 'left', minWidth: 220 }}>
          <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--color-accent)', fontFamily: 'monospace', letterSpacing: '0.04em' }}>{timeStr}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{dateStr}</div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Статистика системы</div>
      <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
        {statCards.map((s) => <Col xs={24} sm={12} lg={8} xl={4} key={s.key}><StatCard label={s.label} value={loading ? '—' : (stats?.[s.key as keyof Stats] ?? 0)} icon={s.icon} color={s.color} loading={loading} onClick={() => navigate(s.path)} /></Col>)}
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} xl={9}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Разделы системы</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...quickLinks, ...(isAdmin() ? adminLinks : [])].map((link) => <div key={link.path} onClick={() => navigate(link.path)} className="dashboard-link" style={{ borderColor: 'var(--color-border)' }}>
              <div className="dashboard-link__icon" style={{ background: `${link.color}18`, borderColor: `${link.color}30`, color: link.color }}>{link.icon}</div>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 14 }}>{link.title}</div><div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{link.subtitle}</div></div>
              {link.stat && stats ? <Tag>{stats[link.stat]}</Tag> : <RightOutlined />}
            </div>)}
          </div>
        </Col>

        <Col xs={24} xl={8}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Ожидают подтверждения</div>
          <Table rowKey="id" size="small" loading={loading} dataSource={pendingItems} pagination={{ pageSize: 5 }} scroll={{ x: true }} columns={[
            { title: 'Документ / план', render: (_, r) => r.pending_kind === 'invoice' ? (r.number || 'Операция') : `План: ${r.recipe?.name || r.finished_product?.name || 'производство'}` },
            { title: 'Тип', render: (_, r) => r.pending_kind === 'invoice' ? labelInvoiceType(r.type) : 'Производственный план' },
            { title: 'Статус', render: (_, r) => <Tag color={statusColors[r.status]}>{labelStatus(r.status)}</Tag> },
            { title: '', render: (_, r) => <div style={{ display: 'flex', gap: 4 }}><Popconfirm title={r.pending_kind === 'invoice' ? 'Подтвердить операцию?' : 'Завершить план?'} description={r.pending_kind === 'invoice' ? 'Остатки будут изменены' : 'Сырьё и материалы будут списаны'} onConfirm={() => r.pending_kind === 'invoice' ? confirmInvoice(r.id) : completePlan(r.id)} okText="Да" cancelText="Нет"><Button size="small">OK</Button></Popconfirm><Popconfirm title="Отменить?" onConfirm={() => cancelPending(r)} okText="Да" cancelText="Нет"><Button size="small" danger>Отмена</Button></Popconfirm></div> },
          ]} />
        </Col>

        <Col xs={24} xl={7}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}><div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Последние действия</div>{isAdmin() && <Button type="link" size="small" onClick={() => navigate('/audit')} style={{ padding: 0 }}>Все →</Button>}</div>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '16px 20px', minHeight: 200 }}>
            {loading ? <Skeleton active paragraph={{ rows: 6 }} /> : recentLogs.length === 0 ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>Действий пока нет</div> : <Timeline style={{ paddingTop: 4 }} items={recentLogs.map((log) => ({ dot: <div style={{ width: 8, height: 8, borderRadius: '50%', background: Object.entries(actionColors).find(([k]) => log.action.startsWith(k))?.[1] || 'var(--color-border)', marginTop: 4 }} />, children: <div><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{log.action}</span><span style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{dayjs(log.created_at).format('HH:mm')}</span></div><div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 1 }}>{log.user?.full_name || log.user?.login} · {log.details}</div></div> }))} />}
          </div>
        </Col>
      </Row>
    </div>
  )
}
