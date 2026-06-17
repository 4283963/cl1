import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  List,
  Card,
  Tag,
  Button,
  Space,
  Empty,
  Badge,
  Alert as AntAlert,
  Modal,
  Statistic,
  Row,
  Col
} from 'antd'
import {
  WarningOutlined,
  FireOutlined,
  SnowflakeOutlined,
  LineChartOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  ExclamationCircleFilled
} from '@ant-design/icons'
import { alertApi } from '../services/api.js'
import dayjs from 'dayjs'

function getAlertFingerprint(alert) {
  if (!alert) return ''
  return `${alert.deviceId || ''}_${alert.alertType || ''}_${alert.temperature || ''}_${alert.createdAt || ''}`
}

function deduplicateAlerts(alerts) {
  const seen = new Map()
  const result = []
  for (const alert of alerts) {
    const fp = getAlertFingerprint(alert)
    const uniqueKey = alert.id != null ? String(alert.id) : fp
    if (!seen.has(uniqueKey)) {
      seen.set(uniqueKey, true)
      result.push({ ...alert, _stableKey: uniqueKey })
    }
  }
  return result
}

function AlertMonitor({ onAlertChange }) {
  const [alerts, setAlerts] = useState([])
  const [allAlerts, setAllAlerts] = useState([])
  const [loading, setLoading] = useState(false)
  const [showUnacknowledged, setShowUnacknowledged] = useState(true)
  const [popAlert, setPopAlert] = useState(null)
  const navigate = useNavigate()
  const wsRef = useRef(null)
  const pendingWsMessagesRef = useRef([])
  const flushTimerRef = useRef(null)

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const [unackRes, allRes] = await Promise.all([
        alertApi.getUnacknowledged(),
        alertApi.getAll()
      ])
      setAlerts(deduplicateAlerts(unackRes.data))
      setAllAlerts(deduplicateAlerts(allRes.data))

      if (unackRes.data.length > 0 && !popAlert) {
        setPopAlert(deduplicateAlerts(unackRes.data)[0])
      }
    } catch (e) {
      console.error('Failed to fetch alerts:', e)
    } finally {
      setLoading(false)
    }
  }

  const flushPendingMessages = useCallback(() => {
    const messages = pendingWsMessagesRef.current
    if (messages.length === 0) return
    pendingWsMessagesRef.current = []

    const latestByFingerprint = new Map()
    for (const msg of messages) {
      const fp = getAlertFingerprint(msg)
      latestByFingerprint.set(fp, msg)
    }

    const uniqueNewAlerts = Array.from(latestByFingerprint.values())
    if (uniqueNewAlerts.length === 0) return

    const firstNewAlert = uniqueNewAlerts[0]

    setPopAlert(prev => {
      if (prev) return prev
      return { ...firstNewAlert, _stableKey: firstNewAlert.id != null ? String(firstNewAlert.id) : getAlertFingerprint(firstNewAlert) }
    })

    setAlerts(prev => {
      const merged = [...uniqueNewAlerts, ...prev]
      return deduplicateAlerts(merged)
    })

    setAllAlerts(prev => {
      const merged = [...uniqueNewAlerts, ...prev]
      return deduplicateAlerts(merged)
    })
  }, [])

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws/alerts`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected')
    }

    ws.onmessage = (event) => {
      try {
        const newAlert = JSON.parse(event.data)
        if (!newAlert || !newAlert.deviceId) {
          console.warn('Invalid alert payload, skipping:', newAlert)
          return
        }

        pendingWsMessagesRef.current.push(newAlert)

        if (!flushTimerRef.current) {
          flushTimerRef.current = setTimeout(() => {
            flushPendingMessages()
            flushTimerRef.current = null
          }, 300)
        }
      } catch (e) {
        console.error('Failed to parse WS message:', e)
      }
    }

    ws.onerror = (e) => {
      console.error('WebSocket error:', e)
    }

    return () => {
      ws.close()
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current)
        flushTimerRef.current = null
      }
    }
  }, [flushPendingMessages])

  const handleAcknowledge = async (id) => {
    try {
      await alertApi.acknowledge(id)
      if (popAlert && (popAlert.id === id || popAlert._stableKey === id)) {
        setPopAlert(null)
      }
      await fetchAlerts()
      onAlertChange && onAlertChange()
    } catch (e) {
      console.error('Failed to acknowledge alert:', e)
    }
  }

  const handleViewChart = (deviceId) => {
    navigate(`/device/${deviceId}/chart`)
  }

  const displayAlerts = showUnacknowledged ? alerts : allAlerts

  const getAlertIcon = (type) => {
    switch (type) {
      case 'TEMP_TOO_HIGH':
        return <FireOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
      case 'TEMP_TOO_LOW':
        return <SnowflakeOutlined style={{ color: '#1890ff', fontSize: 20 }} />
      default:
        return <WarningOutlined style={{ color: '#faad14', fontSize: 20 }} />
    }
  }

  const getAlertTag = (type) => {
    switch (type) {
      case 'TEMP_TOO_HIGH':
        return <Tag color="red" icon={<FireOutlined />}>温度过高</Tag>
      case 'TEMP_TOO_LOW':
        return <Tag color="blue" icon={<SnowflakeOutlined />}>温度过低</Tag>
      default:
        return <Tag color="orange">其他</Tag>
    }
  }

  const unacknowledgedCount = alerts.length
  const totalCount = allAlerts.length

  return (
    <div>
      <Modal
        title={
          <Space>
            <ExclamationCircleFilled style={{ color: '#ff4d4f', fontSize: 24 }} />
            <span style={{ color: '#ff4d4f', fontSize: 18 }}>紧急温度告警</span>
          </Space>
        }
        open={!!popAlert}
        onCancel={() => setPopAlert(null)}
        footer={
          <Space>
            <Button onClick={() => popAlert && handleViewChart(popAlert.deviceId)}>
              <LineChartOutlined /> 查看温度曲线
            </Button>
            <Button type="primary" danger onClick={() => popAlert && handleAcknowledge(popAlert.id || popAlert._stableKey)}>
              <CheckCircleOutlined /> 确认告警
            </Button>
          </Space>
        }
        width={520}
      >
        {popAlert && (
          <div style={{ padding: '12px 0' }}>
            <AntAlert
              message="疫苗有变质风险！"
              description={popAlert.message}
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <div style={{ background: '#fff1f0', padding: 16, borderRadius: 6, border: '1px solid #ffa39e' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="设备"
                    value={popAlert.deviceName}
                    valueStyle={{ fontSize: 16 }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="疫苗批次"
                    value={popAlert.batchNo || '未知'}
                    valueStyle={{ fontSize: 16 }}
                  />
                </Col>
              </Row>
              <Row gutter={16} style={{ marginTop: 12 }}>
                <Col span={12}>
                  <Statistic
                    title="告警类型"
                    value={popAlert.alertType === 'TEMP_TOO_HIGH' ? '温度过高' : '温度过低'}
                    valueStyle={{ color: '#ff4d4f', fontSize: 16 }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="当前温度"
                    value={popAlert.temperature?.toFixed(2)}
                    suffix="℃"
                    valueStyle={{ color: '#ff4d4f', fontSize: 20, fontWeight: 'bold' }}
                  />
                </Col>
              </Row>
              <div style={{ marginTop: 12, color: '#999', fontSize: 12 }}>
                告警时间: {popAlert.createdAt ? dayjs(popAlert.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="待处理告警"
              value={unacknowledgedCount}
              valueStyle={{ color: unacknowledgedCount > 0 ? '#ff4d4f' : '#52c41a' }}
              prefix={
                <Badge count={unacknowledgedCount} size="small" offset={[5, -2]}>
                  <WarningOutlined style={{ fontSize: 20 }} />
                </Badge>
              }
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="历史告警总数"
              value={totalCount}
              prefix={<WarningOutlined style={{ color: '#faad14', fontSize: 20 }} />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Button
              type={showUnacknowledged ? 'primary' : 'default'}
              danger={showUnacknowledged}
              icon={<ReloadOutlined />}
              onClick={() => setShowUnacknowledged(!showUnacknowledged)}
              style={{ width: '100%' }}
            >
              {showUnacknowledged ? '查看全部告警' : '仅看未处理'}
            </Button>
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <Space>
            <WarningOutlined style={{ color: '#ff4d4f' }} />
            <span>{showUnacknowledged ? '实时告警 (未处理)' : '告警历史记录'}</span>
            {unacknowledgedCount > 0 && showUnacknowledged && (
              <Badge count={unacknowledgedCount} size="small" className="alert-badge" />
            )}
          </Space>
        }
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchAlerts} loading={loading}>
            刷新
          </Button>
        }
      >
        {displayAlerts.length === 0 ? (
          <Empty description={showUnacknowledged ? '暂无告警，所有设备运行正常 ✓' : '暂无历史告警记录'} />
        ) : (
          <List
            itemLayout="vertical"
            dataSource={displayAlerts}
            loading={loading}
            renderItem={(item) => (
              <List.Item
                key={item._stableKey}
                style={{
                  background: !item.acknowledged ? '#fff1f0' : '#fff',
                  border: `1px solid ${!item.acknowledged ? '#ffa39e' : '#e8e8e8'}`,
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 12
                }}
              >
                <List.Item.Meta
                  avatar={getAlertIcon(item.alertType)}
                  title={
                    <Space>
                      <strong style={{ color: '#ff4d4f', fontSize: 16 }}>
                        {item.message}
                      </strong>
                      {!item.acknowledged && (
                        <Tag color="red" className="alert-flash">
                          ⚠ 待处理
                        </Tag>
                      )}
                      {item.acknowledged && (
                        <Tag color="green">
                          <CheckCircleOutlined /> 已处理
                        </Tag>
                      )}
                    </Space>
                  }
                  description={
                    <Space wrap size="middle" style={{ marginTop: 8 }}>
                      {getAlertTag(item.alertType)}
                      <Tag color="blue">设备: {item.deviceName} ({item.deviceCode})</Tag>
                      <Tag color="purple">批次: {item.batchNo || '未知'}</Tag>
                      <Tag color="orange">
                        当前温度: <strong>{item.temperature?.toFixed(2)} ℃</strong>
                      </Tag>
                      <span style={{ color: '#999' }}>
                        时间: {item.createdAt ? dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
                      </span>
                      {item.acknowledged && (
                        <span style={{ color: '#52c41a' }}>
                          处理时间: {item.acknowledgedAt ? dayjs(item.acknowledgedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
                        </span>
                      )}
                    </Space>
                  }
                />
                <Space style={{ marginTop: 12 }}>
                  <Button
                    type="primary"
                    icon={<LineChartOutlined />}
                    onClick={() => handleViewChart(item.deviceId)}
                  >
                    查看温度曲线
                  </Button>
                  {!item.acknowledged && (
                    <Button
                      danger
                      icon={<CheckCircleOutlined />}
                      onClick={() => handleAcknowledge(item.id || item._stableKey)}
                    >
                      确认告警
                    </Button>
                  )}
                </Space>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  )
}

export default AlertMonitor
