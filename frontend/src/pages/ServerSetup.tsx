import React, { useState } from 'react'
import { Button, Input, Form, Alert, Typography } from 'antd'
import { GlobalOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { ping } from '../utils/api'

const { Title, Text } = Typography

interface Props {
  onConfigured: () => void
}

export default function ServerSetup({ onConfigured }: Props) {
  const [url, setUrl] = useState(localStorage.getItem('server_url') || 'http://192.168.1.100:8080')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleConnect = async () => {
    setLoading(true)
    setError('')
    setSuccess(false)
    try {
      const cleanUrl = url.replace(/\/$/, '')
      await ping(cleanUrl)
      localStorage.setItem('server_url', cleanUrl)
      setSuccess(true)
      setTimeout(onConfigured, 800)
    } catch {
      setError('Не удалось подключиться к серверу. Проверьте IP-адрес и порт.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 480,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: 40,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            background: 'rgba(22, 119, 255, 0.1)',
            border: '1px solid rgba(22, 119, 255, 0.3)',
            borderRadius: 12,
            marginBottom: 16,
          }}>
            <GlobalOutlined style={{ fontSize: 28, color: 'var(--color-accent)' }} />
          </div>
          <Title level={3} style={{ color: 'var(--color-text-primary)', margin: 0, fontSize: 22 }}>
            АВТО-КОНТУР
          </Title>
          <Text style={{ color: 'var(--color-text-muted)', fontSize: 12, letterSpacing: '0.1em' }}>
            JSOL TEAM · ERP СИСТЕМА
          </Text>
        </div>

        <Title level={5} style={{ color: 'var(--color-text-secondary)', marginBottom: 20, fontWeight: 400 }}>
          Укажите адрес сервера предприятия
        </Title>

        <Form layout="vertical" onFinish={handleConnect}>
          <Form.Item label="IP-адрес / URL сервера">
            <Input
              size="large"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://192.168.1.100:8080"
              prefix={<GlobalOutlined style={{ color: 'var(--color-text-muted)' }} />}
              style={{ fontSize: 16, height: 52 }}
            />
          </Form.Item>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              style={{ marginBottom: 16, background: 'rgba(255, 77, 79, 0.1)', border: '1px solid rgba(255, 77, 79, 0.3)' }}
            />
          )}

          {success && (
            <Alert
              message="Соединение установлено!"
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
              style={{ marginBottom: 16 }}
            />
          )}

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
            style={{ height: 52, fontSize: 16, fontWeight: 600, letterSpacing: '0.05em' }}
          >
            {loading ? 'Подключение...' : 'ПОДКЛЮЧИТЬСЯ К СЕРВЕРУ'}
          </Button>
        </Form>

        <Text style={{ display: 'block', textAlign: 'center', marginTop: 24, color: 'var(--color-text-muted)', fontSize: 12 }}>
          Система работает в закрытом контуре предприятия
        </Text>
      </div>
    </div>
  )
}
