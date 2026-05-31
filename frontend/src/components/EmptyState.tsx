import { Button } from 'antd'
import { PlusOutlined, InboxOutlined } from '@ant-design/icons'

interface EmptyStateProps {
  title?: string
  description?: string
  action?: { label: string; onClick: () => void }
  icon?: React.ReactNode
}

export default function EmptyState({
  title = 'Нет данных',
  description = 'Добавьте первую запись, нажав кнопку ниже',
  action,
  icon,
}: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 32px',
      background: 'var(--color-surface)',
      border: '1px dashed var(--color-border)',
      borderRadius: 10,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 48, color: 'var(--color-border)', marginBottom: 16 }}>
        {icon ?? <InboxOutlined />}
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: action ? 20 : 0, maxWidth: 320 }}>
        {description}
      </div>
      {action && (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={action.onClick}
          style={{ height: 48, paddingInline: 24 }}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
