import { Breadcrumb, Typography } from 'antd'
import { HomeOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'

const { Text } = Typography

interface Crumb {
  label: string
  path?: string
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  crumbs?: Crumb[]
  action?: React.ReactNode
  badge?: React.ReactNode
}

export default function PageHeader({ title, subtitle, crumbs, action, badge }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      {crumbs && (
        <Breadcrumb
          style={{ marginBottom: 10 }}
          items={[
            {
              title: (
                <Link to="/dashboard" style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <HomeOutlined /> Главная
                </Link>
              ),
            },
            ...crumbs.map((c) => ({
              title: c.path
                ? <Link to={c.path} style={{ color: 'var(--color-text-muted)' }}>{c.label}</Link>
                : <span style={{ color: 'var(--color-text-secondary)' }}>{c.label}</span>,
            })),
          ]}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <Text style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2, display: 'block' }}>
              {subtitle}
            </Text>
          )}
        </div>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>
      <div style={{ height: 1, background: 'var(--color-border)', marginTop: 16 }} />
    </div>
  )
}
