import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { Layout, Menu, Badge, notification, Button, Result } from 'antd'
import {
  DashboardOutlined,
  CarOutlined,
  WarningOutlined,
  BellOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import DeviceList from './pages/DeviceList.jsx'
import AlertMonitor from './pages/AlertMonitor.jsx'
import TemperatureChart from './components/TemperatureChart.jsx'
import { alertApi } from './services/api.js'

const { Header, Sider, Content } = Layout

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="页面渲染异常"
          subTitle="系统遇到了一个渲染错误，请刷新页面重试。如果问题持续，请联系技术支持。"
          extra={[
            <Button
              key="retry"
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => {
                this.setState({ hasError: false, error: null })
              }}
            >
              重试
            </Button>,
            <Button
              key="reload"
              onClick={() => window.location.reload()}
            >
              刷新页面
            </Button>
          ]}
        />
      )
    }
    return this.props.children
  }
}

function App() {
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0)
  const [api, contextHolder] = notification.useNotification()
  const navigate = useNavigate()
  const lastNotifiedRef = useRef(new Map())
  const notifThrottleRef = useRef(new Map())

  const fetchUnacknowledgedCount = async () => {
    try {
      const res = await alertApi.getUnacknowledged()
      setUnacknowledgedCount(res.data.length)
    } catch (e) {
      console.error('Failed to fetch alerts:', e)
    }
  }

  useEffect(() => {
    fetchUnacknowledgedCount()
    const interval = setInterval(fetchUnacknowledgedCount, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleWsAlert = useCallback((alert) => {
    if (!alert || !alert.deviceId) return

    setUnacknowledgedCount(prev => prev + 1)

    const dedupeKey = `${alert.deviceId}_${alert.alertType}_${alert.temperature}`
    const now = Date.now()
    const lastTime = notifThrottleRef.current.get(dedupeKey) || 0
    if (now - lastTime < 3000) {
      return
    }
    notifThrottleRef.current.set(dedupeKey, now)

    if (lastNotifiedRef.current.size > 50) {
      const oldest = lastNotifiedRef.current.keys().next().value
      lastNotifiedRef.current.delete(oldest)
    }

    api.open({
      message: '温度告警！',
      description: alert.message,
      icon: <WarningOutlined style={{ color: '#ff4d4f' }} />,
      duration: 0,
      type: 'error',
      onClick: () => navigate('/alerts')
    })
  }, [api, navigate])

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws/alerts`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('WebSocket connected')
    }

    ws.onmessage = (event) => {
      try {
        const alert = JSON.parse(event.data)
        handleWsAlert(alert)
      } catch (e) {
        console.error('Failed to parse WS message:', e)
      }
    }

    ws.onerror = (e) => {
      console.error('WebSocket error:', e)
    }

    return () => ws.close()
  }, [handleWsAlert])

  const menuItems = [
    {
      key: '/devices',
      icon: <CarOutlined />,
      label: '物联网设备列表'
    },
    {
      key: '/alerts',
      icon: (
        <Badge count={unacknowledgedCount} size="small" offset={[10, 0]}>
          <BellOutlined />
        </Badge>
      ),
      label: '实时告警中心'
    }
  ]

  return (
    <>
      {contextHolder}
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{
          background: 'linear-gradient(90deg, #001529 0%, #003a8c 100%)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <DashboardOutlined style={{ color: '#fff', fontSize: 24, marginRight: 12 }} />
          <h1 style={{ color: '#fff', fontSize: 20, margin: 0 }}>
            医疗冷链温度主动监控系统
          </h1>
          <span style={{ color: 'rgba(255,255,255,0.65)', marginLeft: 16, fontSize: 13 }}>
            调度员管理后台
          </span>
        </Header>
        <Layout>
          <Sider width={220} theme="light">
            <Menu
              mode="inline"
              defaultSelectedKeys={['/devices']}
              style={{ height: '100%', borderRight: 0 }}
              items={menuItems.map(item => ({
                ...item,
                label: (
                  <NavLink to={item.key} style={{ display: 'block' }}>
                    {item.label}
                  </NavLink>
                )
              }))}
            />
          </Sider>
          <Layout style={{ padding: '24px', background: '#f0f2f5' }}>
            <Content style={{
              background: '#fff',
              padding: 24,
              margin: 0,
              minHeight: 280,
              borderRadius: 8
            }}>
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<DeviceList />} />
                  <Route path="/devices" element={<DeviceList />} />
                  <Route path="/alerts" element={<AlertMonitor onAlertChange={fetchUnacknowledgedCount} />} />
                  <Route path="/device/:id/chart" element={<TemperatureChart />} />
                </Routes>
              </ErrorBoundary>
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </>
  )
}

export default App
