import { Spin } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'

interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  color?: string
  loading?: boolean
  trend?: { value: string; up: boolean }
  onClick?: () => void
}

export default function StatCard({ label, value, icon, color = '#1677ff', loading, trend, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10,
        padding: '18px 18px', cursor: onClick ? 'pointer' : 'default', transition: 'border-color 0.2s, transform 0.15s', height: '100%', minHeight: 118,
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = color)}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = 'var(--color-border)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, lineHeight: 1.35, minHeight: 30 }}>
            {label}
          </div>
          {loading ? <Spin size="small" /> : <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>{value}</div>}
          {trend && !loading && <div style={{ marginTop: 6, fontSize: 12, color: trend.up ? 'var(--color-success)' : 'var(--color-danger)' }}>{trend.up ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {trend.value}</div>}
        </div>
        {icon && <div style={{ width: 42, height: 42, minWidth: 42, flexShrink: 0, lineHeight: 1, background: `${color}18`, border: `1px solid ${color}30`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color }}>{icon}</div>}
      </div>
    </div>
  )
}
