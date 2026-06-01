import { useEffect, useState } from 'react'
import { Layout, Menu, Button, Typography, Avatar, Dropdown, Grid } from 'antd'
import {
  DashboardOutlined, AppstoreOutlined, InboxOutlined, UserOutlined,
  LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, AuditOutlined,
  TeamOutlined, ControlOutlined, SafetyCertificateOutlined, ShopOutlined,
  SlidersOutlined, NodeIndexOutlined, ExperimentOutlined, FileTextOutlined, TableOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const { Sider, Content, Header } = Layout
const { Text } = Typography

export default function AppLayout() {
  const screens = Grid.useBreakpoint()
  const isMobile = screens.md === false
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, isAdmin } = useAuthStore()

  useEffect(() => {
    if (isMobile) setCollapsed(true)
  }, [isMobile])

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
    if (isMobile) setCollapsed(true)
  }

  // Build menu items based on role
  const navItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Главная',
    },
    {
      key: 'catalogs',
      icon: <AppstoreOutlined />,
      label: 'Справочники',
      children: [
        { key: '/nomenclature', icon: <NodeIndexOutlined />, label: 'Номенклатура' },
        { key: '/raw-material-categories', icon: <SlidersOutlined />, label: 'Категории сырья' },
        { key: '/material-categories', icon: <SlidersOutlined />, label: 'Категории материалов' },
        { key: '/finished-products', icon: <ShopOutlined />, label: 'Готовая продукция' },
        { key: '/units', icon: <SlidersOutlined />, label: 'Единицы измерения' },
        { key: '/conversions', icon: <SlidersOutlined />, label: 'Коэффициенты' },
      ],
    },
    {
      key: '/recipes',
      icon: <ExperimentOutlined />,
      label: 'Рецепты',
    },
    {
      key: '/warehouse',
      icon: <InboxOutlined />,
      label: 'Накладные и склад',
    },
    {
      key: 'stockTables',
      icon: <TableOutlined />,
      label: 'Основные таблицы',
      children: [
        { key: '/stock-tables', icon: <TableOutlined />, label: 'Все остатки' },
      ],
    },
    {
      key: '/reports',
      icon: <FileTextOutlined />,
      label: 'Отчеты',
    },
    ...(isAdmin() ? [{
      key: 'admin',
      icon: <ControlOutlined />,
      label: 'Администрирование',
      children: [
        { key: '/users', icon: <TeamOutlined />, label: 'Пользователи' },
        { key: '/roles', icon: <SafetyCertificateOutlined />, label: 'Роли и права' },
        { key: '/audit', icon: <AuditOutlined />, label: 'Журнал действий' },
      ],
    }] : []),
  ]

  const userMenu = [
    {
      key: 'profile', type: 'group' as const,
      label: <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Аккаунт</span>,
    },
    {
      key: 'info',
      label: (
        <div>
          <div style={{ fontWeight: 600 }}>{user?.full_name || user?.login}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{user?.role}</div>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Выйти из системы',
      danger: true,
      onClick: () => { logout(); navigate('/login') },
    },
  ]

  // Current page title
  const pageTitles: Record<string, string> = {
    '/dashboard': 'Главная',
    '/nomenclature': 'Номенклатура',
    '/raw-materials': 'Сырьё',
    '/materials': 'Материалы',
    '/raw-material-categories': 'Категории сырья',
    '/material-categories': 'Категории материалов',
    '/finished-products': 'Готовая продукция',
    '/units': 'Единицы измерения',
    '/conversions': 'Коэффициенты перевода',
    '/warehouse': 'Накладные и склад',
    '/stock-tables': 'Основные таблицы',
    '/reports': 'Отчеты',
    '/recipes': 'Рецепты',
    '/users': 'Пользователи',
    '/roles': 'Роли и права',
    '/audit': 'Журнал действий',
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={isMobile ? 260 : 224}
        collapsedWidth={isMobile ? 0 : 64}
        style={{
          position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100,
          overflow: 'hidden', borderRight: '1px solid var(--color-border)',
          display: 'flex', flexDirection: 'column',
          transform: isMobile && collapsed ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'transform 0.2s, width 0.2s',
          boxShadow: isMobile && !collapsed ? '0 0 0 9999px rgba(0,0,0,0.45)' : undefined,
        }}
      >
        {/* Logo */}
        <div style={{
          padding: collapsed ? '18px 0' : '18px 18px',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 10,
          minHeight: 64,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, #1677ff, #4096ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 900, color: '#fff',
          }}>
            АК
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontWeight: 800, color: '#fff', fontSize: 15, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                АВТО<span style={{ color: '#4096ff' }}>КОНТУР</span>
              </div>
              <div style={{ fontSize: 9, color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}>
                JSOL TEAM
              </div>
            </div>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['catalogs', 'admin']}
          items={navItems}
          onClick={handleMenuClick}
          style={{ border: 'none', background: 'transparent', flex: 1, overflowY: 'auto' }}
        />

        {/* Version tag at bottom */}
        {!collapsed && (
          <div style={{
            textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 10,
            letterSpacing: '0.06em', padding: '12px 8px',
            borderTop: '1px solid var(--color-border)', flexShrink: 0,
          }}>
            v1.5.0 · Спринт 1.5
          </div>
        )}
      </Sider>

      {isMobile && !collapsed && (
        <div
          onClick={() => setCollapsed(true)}
          style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.35)' }}
        />
      )}

      <Layout style={{ marginLeft: isMobile ? 0 : (collapsed ? 64 : 224), transition: 'margin 0.2s' }}>
        {/* Top header */}
        <Header style={{
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          padding: isMobile ? '0 12px' : '0 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 99, height: 56,
          gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ color: 'var(--color-text-secondary)', fontSize: 16, width: 36, height: 36, padding: 0 }}
            />
            <Text style={{ color: 'var(--color-text-secondary)', fontSize: 14, display: isMobile ? 'inline' : 'none' }}
              className="page-title-header">
              {pageTitles[location.pathname] || ''}
            </Text>
          </div>

          <Dropdown menu={{ items: userMenu }} placement="bottomRight" trigger={['click']}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', padding: '4px 10px',
              borderRadius: 8, transition: 'background 0.2s',
              border: '1px solid transparent',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--color-surface-2)'
                e.currentTarget.style.borderColor = 'var(--color-border)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'transparent'
              }}
            >
              <Avatar
                size={30}
                icon={<UserOutlined />}
                style={{ background: 'rgba(22,119,255,0.18)', color: 'var(--color-accent)', flexShrink: 0 }}
              />
              <div style={{ lineHeight: 1.3, display: isMobile ? 'none' : 'block' }}>
                <div style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>
                  {user?.full_name || user?.login}
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                  {user?.role}
                </div>
              </div>
            </div>
          </Dropdown>
        </Header>

        <Content style={{ padding: isMobile ? 12 : 24, minHeight: 'calc(100vh - 56px)', overflow: 'auto' }}>
          <div className="fade-in">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
