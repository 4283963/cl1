import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Table,
  Tag,
  Card,
  Space,
  Button,
  Statistic,
  Row,
  Col,
  Badge,
  Tooltip
} from 'antd'
import {
  CarOutlined,
  WarehouseOutlined,
  LineChartOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons'
import { deviceApi } from '../services/api.js'
import dayjs from 'dayjs'

function DeviceList() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const fetchDevices = async () => {
    setLoading(true)
    try {
      const res = await deviceApi.getAll()
      setDevices(res.data)
    } catch (e) {
      console.error('Failed to fetch devices:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDevices()
    const interval = setInterval(fetchDevices, 10000)
    return () => clearInterval(interval)
  }, [])

  const onlineCount = devices.filter(d => d.online).length
  const offlineCount = devices.filter(d => !d.online).length
  const alarmCount = devices.filter(d => {
    if (d.currentTemp == null) return false
    return d.currentTemp > d.maxTemp || d.currentTemp < d.minTemp
  }).length

  const getTempStatusColor = (device) => {
    if (device.currentTemp == null) return 'default'
    if (device.currentTemp > device.maxTemp || device.currentTemp < device.minTemp) {
      return 'red'
    }
    return 'green'
  }

  const isTempAbnormal = (device) => {
    if (device.currentTemp == null) return false
    return device.currentTemp > device.maxTemp || device.currentTemp < device.minTemp
  }

  const columns = [
    {
      title: '设备编号',
      dataIndex: 'deviceCode',
      key: 'deviceCode',
      width: 120,
      render: (text, record) => (
        <Space>
          {record.deviceType === 'REFRIGERATED_TRUCK' ?
            <CarOutlined style={{ color: '#1890ff' }} /> :
            <WarehouseOutlined style={{ color: '#722ed1' }} />
          }
          <strong>{text}</strong>
        </Space>
      )
    },
    {
      title: '设备名称',
      dataIndex: 'deviceName',
      key: 'deviceName',
      width: 150
    },
    {
      title: '设备类型',
      dataIndex: 'deviceType',
      key: 'deviceType',
      width: 100,
      render: (type) => (
        <Tag color={type === 'REFRIGERATED_TRUCK' ? 'blue' : 'purple'}>
          {type === 'REFRIGERATED_TRUCK' ? '冷链车' : '冷库'}
        </Tag>
      )
    },
    {
      title: '所在位置',
      dataIndex: 'location',
      key: 'location',
      ellipsis: true
    },
    {
      title: '疫苗批次',
      dataIndex: 'batchNo',
      key: 'batchNo',
      width: 140,
      render: (text) => text || '-'
    },
    {
      title: '温度范围(℃)',
      key: 'tempRange',
      width: 120,
      render: (_, record) => (
        <span style={{ color: '#666' }}>
          {record.minTemp} ~ {record.maxTemp}
        </span>
      )
    },
    {
      title: '当前温度',
      dataIndex: 'currentTemp',
      key: 'currentTemp',
      width: 130,
      render: (temp, record) => (
        <Badge
          status={getTempStatusColor(record)}
          text={
            <span style={{
              fontWeight: isTempAbnormal(record) ? 'bold' : 'normal',
              color: isTempAbnormal(record) ? '#ff4d4f' : '#52c41a'
            }}>
              {temp != null ? `${temp.toFixed(2)} ℃` : '暂无数据'}
              {isTempAbnormal(record) && ' ⚠'}
            </span>
          }
        />
      )
    },
    {
      title: '在线状态',
      dataIndex: 'online',
      key: 'online',
      width: 100,
      render: (online) => (
        <Tag
          icon={online ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          color={online ? 'success' : 'default'}
        >
          {online ? '在线' : '离线'}
        </Tag>
      )
    },
    {
      title: '最后心跳',
      dataIndex: 'lastSeenAt',
      key: 'lastSeenAt',
      width: 160,
      render: (time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_, record) => (
        <Tooltip title="查看最近1小时温度曲线">
          <Button
            type="primary"
            size="small"
            icon={<LineChartOutlined />}
            onClick={() => navigate(`/device/${record.id}/chart`)}
          >
            温度曲线
          </Button>
        </Tooltip>
      )
    }
  ]

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="设备总数"
              value={devices.length}
              prefix={<CarOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="在线设备"
              value={onlineCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="离线设备"
              value={offlineCount}
              valueStyle={{ color: '#999' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="温度异常"
              value={alarmCount}
              valueStyle={{ color: alarmCount > 0 ? '#ff4d4f' : '#52c41a' }}
              prefix={
                <span className={alarmCount > 0 ? 'alert-badge' : ''}>
                  ⚠
                </span>
              }
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="物联网设备列表"
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchDevices}
            loading={loading}
          >
            刷新
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={devices}
          loading={loading}
          pagination={{ pageSize: 10 }}
          rowClassName={(record) => isTempAbnormal(record) ? 'alert-flash' : ''}
        />
      </Card>
    </div>
  )
}

export default DeviceList
