import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import { useAuthStore } from './store/authStore'
import ServerSetup from './pages/ServerSetup'
import Login from './pages/Login'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import {
  UnitsPage, ConversionsPage, NomenclaturePage, FinishedProductsPage,
  RawMaterialCategoriesPage, MaterialCategoriesPage, RawMaterialsPage, MaterialsPage,
} from './pages/CatalogPages'
import UsersPage from './pages/UsersPage'
import RolesPage from './pages/RolesPage'
import AuditPage from './pages/AuditPage'
import WarehousePage from './pages/WarehousePage'
import NotFound from './pages/NotFound'
import './index.css'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}
function PublicRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return !token ? <>{children}</> : <Navigate to="/dashboard" replace />
}

export default function App() {
  const [serverConfigured, setServerConfigured] = useState<boolean>(!!localStorage.getItem('server_url'))

  if (!serverConfigured) {
    return (
      <ConfigProvider locale={ruRU} theme={{ algorithm: theme.darkAlgorithm }}>
        <ServerSetup onConfigured={() => setServerConfigured(true)} />
      </ConfigProvider>
    )
  }

  return (
    <ConfigProvider
      locale={ruRU}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
          fontSize: 14,
          colorBgContainer: '#161b22',
          colorBgElevated: '#21262d',
          colorBorder: '#30363d',
          colorText: '#e6edf3',
          colorTextSecondary: '#8b949e',
        },
        components: {
          Button: { controlHeight: 36, controlHeightLG: 48 },
          Input: { controlHeight: 36, controlHeightLG: 52 },
          Select: { controlHeight: 36 },
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="nomenclature" element={<NomenclaturePage />} />
            <Route path="raw-materials" element={<RawMaterialsPage />} />
            <Route path="materials" element={<MaterialsPage />} />
            <Route path="raw-material-categories" element={<RawMaterialCategoriesPage />} />
            <Route path="material-categories" element={<MaterialCategoriesPage />} />
            <Route path="finished-products" element={<FinishedProductsPage />} />
            <Route path="units" element={<UnitsPage />} />
            <Route path="conversions" element={<ConversionsPage />} />
            <Route path="warehouse" element={<WarehousePage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}
