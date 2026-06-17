import React, { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { Layout, Menu, Badge, notification } from 'antd'
import {
  DashboardOutlined,
  CarOutlined,
  WarningOutlined,
  BellOutlined
} from '@ant-design/icons'
import DeviceList from './pages/DeviceList.jsx'
import AlertMonitor from './pages/AlertMonitor.jsx'
import TemperatureChart from './components/TemperatureChart.jsx'
import { alertApi } from './services/api.js'

const { Header, Sider, Content } = Layout

function App() {
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0)
  const [api, contextHolder] = notification.useNotification()
  const navigate = useNavigate()

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
        setUnacknowledgedCount(prev => prev + 1)
        api.open({
          message: '温度告警！',
          description: alert.message,
          icon: <WarningOutlined style={{ color: '#ff4d4f' }} />,
          duration: 0,
          type: 'error',
          onClick: () => navigate('/alerts')
        })
      } catch (e) {
        console.error('Failed to parse WS message:', e)
      }
    }

    ws.onerror = (e) => {
      console.error('WebSocket error:', e)
    }

    return () => ws.close()
  }, [api, navigate])

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
              <Routes>
                <Route path="/" element={<DeviceList />} />
                <Route path="/devices" element={<DeviceList />} />
                <Route path="/alerts" element={<AlertMonitor onAlertChange={fetchUnacknowledgedCount} />} />
                <Route path="/device/:id/chart" element={<TemperatureChart />} />
              </Routes>
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </>
  )
}

export default App
