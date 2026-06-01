import { Button, Typography } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

const { Text } = Typography

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', gap: 16,
    }}>
      <div style={{
        fontSize: 96, fontWeight: 900, lineHeight: 1,
        background: 'linear-gradient(135deg, var(--color-border), var(--color-surface-2))',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        letterSpacing: '-0.05em',
      }}>
        404
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
        Страница не найдена
      </div>
      <Text style={{ color: 'var(--color-text-muted)', maxWidth: 300 }}>
        Запрошенный раздел не существует или недоступен для текущего пользователя
      </Text>
      <Button
        type="primary"
        icon={<ArrowLeftOutlined />}
        size="large"
        onClick={() => navigate('/dashboard')}
        style={{ height: 48, marginTop: 8 }}
      >
        На главную
      </Button>
    </div>
  )
}
