import { useEffect, useState } from 'react'
import { Alert, Button, Card, Form, Input, Switch, message } from 'antd'
import PageHeader from '../components/PageHeader'
import { api } from '../utils/api'
import { useSettingsStore } from '../store/settingsStore'

export default function SystemSettingsPage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const { companyName, setCompanyName, themeMode, setThemeMode } = useSettingsStore()

  useEffect(() => {
    form.setFieldsValue({ company_name: companyName, dark_theme: themeMode === 'dark' })
  }, [companyName, form, themeMode])

  const save = async () => {
    const values = await form.validateFields()
    setLoading(true)
    try {
      const payload = { company_name: values.company_name }
      await api.put('/api/v1/settings', payload)
      setCompanyName(values.company_name)
      setThemeMode(values.dark_theme ? 'dark' : 'light')
      message.success('Системные настройки сохранены')
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'Ошибка сохранения настроек')
    } finally {
      setLoading(false)
    }
  }

  return <div>
    <PageHeader title="Настройки системы" subtitle="Глобальные параметры компании. Раздел доступен только администраторам." crumbs={[{ label: 'Администрирование' }, { label: 'Настройки системы' }]} />
    <Card style={{ maxWidth: 720 }}>
      <Alert type="info" showIcon style={{ marginBottom: 20 }} message="Название компании сохраняется на сервере и применяется у всех пользователей после обновления интерфейса." />
      <Form form={form} layout="vertical">
        <Form.Item name="company_name" label="Название компании" rules={[{ required: true, whitespace: true, message: 'Введите название компании' }]}>
          <Input size="large" placeholder="Например: Авто-Контур" />
        </Form.Item>
        <Form.Item name="dark_theme" label="Темная тема этого рабочего места" valuePropName="checked" extra="Тема остается персональной настройкой браузера.">
          <Switch checkedChildren="Вкл" unCheckedChildren="Выкл" />
        </Form.Item>
        <Button type="primary" size="large" loading={loading} onClick={save}>Сохранить настройки</Button>
      </Form>
    </Card>
  </div>
}
