import React, { useState } from 'react'
import { Button, Input, Form, Alert, Typography } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { api } from '../utils/api'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'

const { Title, Text } = Typography

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  const onFinish = async (values: { login: string; password: string }) => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/api/v1/auth/login', values)
      setAuth(data.token, data.user)
      navigate('/dashboard')
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Ошибка подключения к серверу')
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
        maxWidth: 440,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: 40,
      }} className="fade-in">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, rgba(22,119,255,0.15), rgba(22,119,255,0.05))',
            border: '1px solid rgba(22,119,255,0.25)',
            borderRadius: 12,
            padding: '12px 24px',
            marginBottom: 20,
          }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              АВТО<span style={{ color: 'var(--color-accent)' }}>КОНТУР</span>
            </span>
          </div>
          <div>
            <Text style={{ color: 'var(--color-text-muted)', fontSize: 12, letterSpacing: '0.12em' }}>
              УПРАВЛЕНИЕ ПРОИЗВОДСТВОМ · JSOL TEAM
            </Text>
          </div>
        </div>

        <Title level={5} style={{ color: 'var(--color-text-secondary)', marginBottom: 24, fontWeight: 400 }}>
          Вход в систему
        </Title>

        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item
            name="login"
            label="Логин"
            rules={[{ required: true, message: 'Введите логин' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: 'var(--color-text-muted)' }} />}
              placeholder="Введите логин"
              style={{ height: 52, fontSize: 16 }}
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Пароль"
            rules={[{ required: true, message: 'Введите пароль' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'var(--color-text-muted)' }} />}
              placeholder="Введите пароль"
              style={{ height: 52, fontSize: 16 }}
              autoComplete="current-password"
            />
          </Form.Item>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              style={{
                marginBottom: 16,
                background: 'rgba(255, 77, 79, 0.08)',
                border: '1px solid rgba(255, 77, 79, 0.25)',
              }}
            />
          )}

          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
            style={{ height: 56, fontSize: 17, fontWeight: 700, letterSpacing: '0.05em', marginTop: 8 }}
          >
            ВОЙТИ
          </Button>
        </Form>

        <Text style={{
          display: 'block',
          textAlign: 'center',
          marginTop: 32,
          color: 'var(--color-text-muted)',
          fontSize: 12,
        }}>
          Нет доступа? Обратитесь к администратору системы
        </Text>
      </div>
    </div>
  )
}
