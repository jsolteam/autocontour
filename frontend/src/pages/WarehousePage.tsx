import { Row, Col, Typography, Tag, Button } from 'antd'
import {
  InboxOutlined, NodeIndexOutlined, ShopOutlined,
  ExperimentOutlined, ArrowRightOutlined, LockOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'

const { Text } = Typography

const sprint2Features = [
  {
    icon: <InboxOutlined />,
    color: '#1677ff',
    title: 'Основной склад сырья',
    description: 'Учёт остатков всех материалов и номенклатуры с валидацией минуса',
    sprint: 2,
  },
  {
    icon: <ShopOutlined />,
    color: '#52c41a',
    title: 'Склад готовой продукции',
    description: 'Остатки в штуках и паллетах, приход и отгрузка',
    sprint: 2,
  },
  {
    icon: <NodeIndexOutlined />,
    color: '#fa8c16',
    title: 'Склад производства (цеховой)',
    description: 'Виртуальный склад для сырья, переданного в цех',
    sprint: 3,
  },
  {
    icon: <ExperimentOutlined />,
    color: '#722ed1',
    title: 'Планы производства',
    description: 'Двухэтапный процесс: запуск плана и подтверждение завершения',
    sprint: 4,
  },
]

export default function WarehousePage() {
  const navigate = useNavigate()

  return (
    <div>
      <PageHeader
        title="Складской учёт"
        subtitle="Этот раздел будет реализован в Спринтах 2–4"
        crumbs={[{ label: 'Склад' }]}
        badge={<Tag color="warning">В разработке</Tag>}
      />

      {/* Roadmap banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(250,173,20,0.08), rgba(250,173,20,0.03))',
        border: '1px solid rgba(250,173,20,0.2)',
        borderRadius: 12,
        padding: '24px 28px',
        marginBottom: 28,
        display: 'flex', alignItems: 'flex-start', gap: 16,
      }}>
        <LockOutlined style={{ fontSize: 24, color: '#faad14', flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontWeight: 700, color: '#fff', fontSize: 16, marginBottom: 6 }}>
            Раздел находится в разработке
          </div>
          <Text style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Складской учёт, накладные, списание сырья и управление производством появятся в следующих спринтах.
            Пока вы можете наполнить справочники, которые будут использоваться при складских операциях.
          </Text>
          <div style={{ marginTop: 14 }}>
            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              onClick={() => navigate('/nomenclature')}
              style={{ marginRight: 8 }}
            >
              Заполнить номенклатуру
            </Button>
            <Button onClick={() => navigate('/finished-products')}>
              Готовая продукция
            </Button>
          </div>
        </div>
      </div>

      {/* Sprint roadmap */}
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
        Дорожная карта
      </div>

      <Row gutter={[16, 16]}>
        {sprint2Features.map((f) => (
          <Col xs={24} sm={12} key={f.title}>
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              padding: '20px 22px',
              display: 'flex', gap: 16, alignItems: 'flex-start',
              opacity: 0.75,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                background: `${f.color}15`, border: `1px solid ${f.color}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, color: f.color,
              }}>
                {f.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 14 }}>
                    {f.title}
                  </span>
                  <Tag style={{ fontSize: 10, margin: 0 }}>Спринт {f.sprint}</Tag>
                </div>
                <Text style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{f.description}</Text>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      {/* Current state - what's done */}
      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
          Спринт 1 — завершён ✓
        </div>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 10,
        }}>
          {[
            'Авторизация JWT', 'Динамические роли RBAC', 'Справочник номенклатуры',
            'Готовая продукция', 'Единицы измерения', 'Коэффициенты перевода',
            'Управление пользователями', 'Журнал аудита', 'Адаптивный интерфейс',
          ].map((item) => (
            <Tag key={item} color="success" style={{ padding: '4px 10px', fontSize: 13 }}>
              ✓ {item}
            </Tag>
          ))}
        </div>
      </div>
    </div>
  )
}
