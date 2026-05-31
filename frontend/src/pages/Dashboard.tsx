import React from 'react'
import { useEffect, useState } from 'react'
import { Row, Col, Card, Typography, Tag, Button, Skeleton, Timeline } from 'antd'
import {
  AppstoreOutlined, InboxOutlined, TeamOutlined, AuditOutlined,
  ShopOutlined, SlidersOutlined, RightOutlined, ClockCircleOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { api } from '../utils/api'
import StatCard from '../components/StatCard'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
dayjs.locale('ru')

const { Text } = Typography

interface Stats {
  nomenclature: number
  finished_products: number
  units: number
  conversions: number
  users: number
  roles: number
}

interface AuditEntry {
  id: number
  action: string
  details: string
  created_at: string
  user: { login: string; full_name: string }
}

const quickLinks: { icon: React.ReactNode; title: string; subtitle: string; path: string; color: string; stat: string | null; disabled?: boolean }[] = [
  { icon: <AppstoreOutlined />, title: 'Номенклатура', subtitle: 'Сырьё и материалы', path: '/nomenclature', color: '#1677ff', stat: 'nomenclature' },
  { icon: <ShopOutlined />, title: 'Готовая продукция', subtitle: 'Справочник ГП', path: '/finished-products', color: '#52c41a', stat: 'finished_products' },
  { icon: <SlidersOutlined />, title: 'Единицы измерения', subtitle: 'ЕИ и коэффициенты', path: '/units', color: '#13c2c2', stat: 'units' },
  { icon: <InboxOutlined />, title: 'Склад', subtitle: 'Остатки (Спринт 2)', path: '/warehouse', color: '#fa8c16', stat: null as string | null, disabled: true },
]

const adminLinks: { icon: React.ReactNode; title: string; subtitle: string; path: string; color: string; stat: string | null; disabled?: boolean }[] = [
  { icon: <TeamOutlined />, title: 'Пользователи', subtitle: 'Управление доступом', path: '/users', color: '#faad14', stat: 'users' },
  { icon: <AuditOutlined />, title: 'Журнал действий', subtitle: 'История операций', path: '/audit', color: '#722ed1', stat: null },
]

const actionColors: Record<string, string> = {
  'Создание': '#52c41a', 'Изменение': '#1677ff', 'Удаление': '#ff4d4f',
  'Вход': '#13c2c2', 'Запуск': '#fa8c16',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, isAdmin } = useAuthStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentLogs, setRecentLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        const [nom, fp, units, conv, users, roles, logs] = await Promise.allSettled([
          api.get('/api/v1/nomenclature'),
          api.get('/api/v1/finished-products'),
          api.get('/api/v1/units'),
          api.get('/api/v1/conversions'),
          api.get('/api/v1/users'),
          api.get('/api/v1/roles'),
          api.get('/api/v1/audit'),
        ])
        setStats({
          nomenclature: nom.status === 'fulfilled' ? nom.value.data.length : 0,
          finished_products: fp.status === 'fulfilled' ? fp.value.data.length : 0,
          units: units.status === 'fulfilled' ? units.value.data.length : 0,
          conversions: conv.status === 'fulfilled' ? conv.value.data.length : 0,
          users: users.status === 'fulfilled' ? users.value.data.length : 0,
          roles: roles.status === 'fulfilled' ? roles.value.data.length : 0,
        })
        if (logs.status === 'fulfilled') {
          setRecentLogs(logs.value.data.slice(0, 8))
        }
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = dayjs().format('dddd, D MMMM YYYY')

  return (
    <div>
      {/* Hero header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(22,119,255,0.10) 0%, rgba(22,119,255,0.03) 100%)',
        border: '1px solid rgba(22,119,255,0.18)',
        borderRadius: 12,
        padding: '28px 32px',
        marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            Добро пожаловать, {user?.full_name?.split(' ')[0] || user?.login} 👋
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag color="blue" style={{ fontSize: 12 }}>{user?.role}</Tag>
            <Text style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Авто-Контур ERP · JSOL Team</Text>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--color-accent)', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
            {timeStr}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
            {dateStr}
          </div>
        </div>
      </div>

      {/* Sprint banner */}
      <div style={{
        background: 'rgba(250,173,20,0.06)', border: '1px solid rgba(250,173,20,0.2)',
        borderRadius: 8, padding: '12px 20px', marginBottom: 28,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <ClockCircleOutlined style={{ color: '#faad14', fontSize: 16 }} />
        <Text style={{ color: '#faad14', fontSize: 13 }}>
          <strong>Спринт 1 завершён.</strong> Справочники и RBAC готовы. Складской учёт появится в Спринте 2.
        </Text>
      </div>

      {/* Stat cards */}
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        Статистика системы
      </div>
      <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
        {[
          { label: 'Номенклатура', key: 'nomenclature', icon: <AppstoreOutlined />, color: '#1677ff', path: '/nomenclature' },
          { label: 'Готовая продукция', key: 'finished_products', icon: <ShopOutlined />, color: '#52c41a', path: '/finished-products' },
          { label: 'Единицы измерения', key: 'units', icon: <SlidersOutlined />, color: '#13c2c2', path: '/units' },
          { label: 'Коэффициентов', key: 'conversions', icon: <SlidersOutlined />, color: '#722ed1', path: '/conversions' },
          ...(isAdmin() ? [
            { label: 'Пользователи', key: 'users', icon: <TeamOutlined />, color: '#faad14', path: '/users' },
            { label: 'Роли', key: 'roles', icon: <AuditOutlined />, color: '#ff4d4f', path: '/roles' },
          ] : []),
        ].map((s) => (
          <Col xs={12} sm={8} lg={4} key={s.key}>
            <StatCard
              label={s.label}
              value={loading ? '—' : (stats?.[s.key as keyof Stats] ?? 0)}
              icon={s.icon}
              color={s.color}
              loading={loading}
              onClick={() => navigate(s.path)}
            />
          </Col>
        ))}
      </Row>

      <Row gutter={[24, 24]}>
        {/* Quick links */}
        <Col xs={24} lg={14}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Разделы системы
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...quickLinks, ...(isAdmin() ? adminLinks : [])].map((link) => (
              <div
                key={link.path}
                onClick={() => !link.disabled && navigate(link.path)}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  padding: '14px 18px',
                  display: 'flex', alignItems: 'center', gap: 14,
                  cursor: link.disabled ? 'not-allowed' : 'pointer',
                  opacity: link.disabled ? 0.5 : 1,
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => !link.disabled && (e.currentTarget.style.borderColor = link.color)}
                onMouseLeave={e => !link.disabled && (e.currentTarget.style.borderColor = 'var(--color-border)')}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                  background: `${link.color}18`, border: `1px solid ${link.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, color: link.color,
                }}>
                  {link.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 14 }}>
                    {link.title}
                    {link.disabled && <Tag style={{ marginLeft: 8, fontSize: 10 }}>скоро</Tag>}
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{link.subtitle}</div>
                </div>
                {!link.disabled && (
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
                    {link.stat && stats ? (
                      <Tag color="default" style={{ fontFamily: 'monospace' }}>{stats[link.stat as keyof Stats]}</Tag>
                    ) : <RightOutlined />}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Col>

        {/* Recent activity */}
        <Col xs={24} lg={10}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Последние действия
            </div>
            {isAdmin() && (
              <Button type="link" size="small" onClick={() => navigate('/audit')} style={{ padding: 0, fontSize: 12 }}>
                Все записи →
              </Button>
            )}
          </div>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            padding: '16px 20px',
            minHeight: 200,
          }}>
            {loading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : recentLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
                Действий пока нет
              </div>
            ) : (
              <Timeline
                style={{ paddingTop: 4 }}
                items={recentLogs.map((log) => {
                  const actionType = Object.keys(actionColors).find((k) => log.action.startsWith(k))
                  const dotColor = actionType ? actionColors[actionType] : 'var(--color-border)'
                  return {
                    dot: (
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: dotColor, marginTop: 4,
                      }} />
                    ),
                    children: (
                      <div style={{ paddingBottom: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>
                            {log.action}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {dayjs(log.created_at).format('HH:mm')}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 1 }}>
                          {log.user?.full_name || log.user?.login} · {log.details}
                        </div>
                      </div>
                    ),
                  }
                })}
              />
            )}
          </div>
        </Col>
      </Row>
    </div>
  )
}
