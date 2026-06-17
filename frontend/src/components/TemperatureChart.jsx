import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Button,
  Space,
  Spin,
  Statistic,
  Row,
  Col,
  Empty,
  Tag,
  Descriptions
} from 'antd'
import {
  ArrowLeftOutlined,
  LineChartOutlined,
  ReloadOutlined,
  FireOutlined,
  SnowflakeOutlined
} from '@ant-design/icons'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import { temperatureApi, deviceApi } from '../services/api.js'
import dayjs from 'dayjs'

function TemperatureChart() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [device, setDevice] = useState(null)
  const [readings, setReadings] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [deviceRes, tempRes] = await Promise.all([
        deviceApi.getById(id),
        temperatureApi.getLastHour(id)
      ])
      setDevice(deviceRes.data)
      setReadings(tempRes.data.map(r => ({
        ...r,
        timeLabel: dayjs(r.readingTime).format('HH:mm:ss'),
        fullTime: r.readingTime
      })))
    } catch (e) {
      console.error('Failed to fetch data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [id])

  const maxTemp = readings.length > 0 ? Math.max(...readings.map(r => r.temperature)) : 0
  const minTemp = readings.length > 0 ? Math.min(...readings.map(r => r.temperature)) : 0
  const avgTemp = readings.length > 0
    ? readings.reduce((sum, r) => sum + r.temperature, 0) / readings.length
    : 0
  const lastTemp = readings.length > 0 ? readings[readings.length - 1].temperature : null
  const isAbnormal = device && lastTemp != null && (lastTemp > device.maxTemp || lastTemp < device.minTemp)

  const getStatusTag = () => {
    if (!device || lastTemp == null) return <Tag>暂无数据</Tag>
    if (lastTemp > device.maxTemp) return <Tag color="red" icon={<FireOutlined />}>温度过高</Tag>
    if (lastTemp < device.minTemp) return <Tag color="blue" icon={<SnowflakeOutlined />}>温度过低</Tag>
    return <Tag color="green">温度正常</Tag>
  }

  return (
    <div>
      <Space style={{ marginBottom: 24 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
        >
          返回
        </Button>
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchData}
          loading={loading}
        >
          刷新
        </Button>
      </Space>

      <Spin spinning={loading}>
        {device && (
          <>
            <Card style={{ marginBottom: 24 }}>
              <Descriptions title={
                <Space>
                  <LineChartOutlined style={{ color: '#1890ff' }} />
                  <span>{device.deviceName} - 最近1小时温度曲线</span>
                </Space>
              } bordered column={3}>
                <Descriptions.Item label="设备编号">{device.deviceCode}</Descriptions.Item>
                <Descriptions.Item label="设备类型">
                  {device.deviceType === 'REFRIGERATED_TRUCK' ? '冷链车' : '冷库'}
                </Descriptions.Item>
                <Descriptions.Item label="疫苗批次">{device.batchNo || '-'}</Descriptions.Item>
                <Descriptions.Item label="位置">{device.location || '-'}</Descriptions.Item>
                <Descriptions.Item label="安全范围">
                  <span style={{ color: '#52c41a' }}>{device.minTemp}℃ ~ {device.maxTemp}℃</span>
                </Descriptions.Item>
                <Descriptions.Item label="状态">{getStatusTag()}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="当前温度"
                    value={lastTemp != null ? lastTemp.toFixed(2) : '--'}
                    suffix="℃"
                    valueStyle={{
                      color: isAbnormal ? '#ff4d4f' : '#52c41a',
                      fontSize: 24
                    }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="最高温度"
                    value={maxTemp ? maxTemp.toFixed(2) : '--'}
                    suffix="℃"
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="最低温度"
                    value={minTemp ? minTemp.toFixed(2) : '--'}
                    suffix="℃"
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="平均温度"
                    value={avgTemp ? avgTemp.toFixed(2) : '--'}
                    suffix="℃"
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Card>
              </Col>
            </Row>

            <Card title="温度变化趋势图">
              {readings.length === 0 ? (
                <Empty description="暂无温度数据" />
              ) : (
                <div style={{ width: '100%', height: 400 }}>
                  <ResponsiveContainer>
                    <LineChart data={readings} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis
                        dataKey="timeLabel"
                        tick={{ fontSize: 12 }}
                        label={{ value: '时间', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis
                        domain={['auto', 'auto'}
                        tick={{ fontSize: 12 }}
                        label={{ value: '温度(℃)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip
                        labelFormatter={(label) => `时间: ${label}`}
                        formatter={(value) => [`${value.toFixed(2)} ℃`, '温度']}
                      />
                      <Legend />
                      {device && (
                        <>
                          <ReferenceLine y={device.maxTemp} stroke="#ff4d4f" strokeDasharray="5 5" label={{ value: `上限 ${device.maxTemp}℃`, fill: '#ff4d4f', fontSize: 12 }} />
                          <ReferenceLine y={device.minTemp} stroke="#1890ff" strokeDasharray="5 5" label={{ value: `下限 ${device.minTemp}℃`, fill: '#1890ff', fontSize: 12 }} />
                        </>
                      )}
                      <Line
                        type="monotone"
                        dataKey="temperature"
                        stroke="#1890ff"
                        strokeWidth={2}
                        dot={{ fill: '#1890ff', r: 3 }}
                        activeDot={{ r: 6 }}
                        name="温度(℃)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </>
        )}
      </Spin>
    </div>
  )
}

export default TemperatureChart
