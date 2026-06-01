import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import { useAuthStore } from './store/authStore'
import { useSettingsStore } from './store/settingsStore'
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
import StockTablesPage from './pages/StockTablesPage'
import ReportsPage from './pages/ReportsPage'
import ProductionPage from './pages/ProductionPage'
import RecipesPage from './pages/RecipesPage'
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
  const themeMode = useSettingsStore((s) => s.themeMode)

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode
  }, [themeMode])

  if (!serverConfigured) {
    return (
      <ConfigProvider locale={ruRU} theme={{ algorithm: themeMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
        <ServerSetup onConfigured={() => setServerConfigured(true)} />
      </ConfigProvider>
    )
  }

  return (
    <ConfigProvider
      locale={ruRU}
      theme={{
        algorithm: themeMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
          fontSize: 14,
          colorBgContainer: themeMode === 'dark' ? '#161b22' : '#ffffff',
          colorBgElevated: themeMode === 'dark' ? '#21262d' : '#ffffff',
          colorBorder: themeMode === 'dark' ? '#30363d' : '#d9e2ef',
          colorText: themeMode === 'dark' ? '#e6edf3' : '#172033',
          colorTextSecondary: themeMode === 'dark' ? '#8b949e' : '#4f5f75',
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
            <Route path="stock-tables" element={<StockTablesPage />} />
            <Route path="stock-tables/:table" element={<StockTablesPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="production" element={<ProductionPage />} />
            <Route path="recipes" element={<RecipesPage />} />
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
