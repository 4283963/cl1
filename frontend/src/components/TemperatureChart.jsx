import React, { useState, useEffect, useMemo } from 'react'
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
  Descriptions,
  Alert
} from 'antd'
import {
  ArrowLeftOutlined,
  LineChartOutlined,
  ReloadOutlined,
  FireOutlined,
  SnowflakeOutlined,
  WarningOutlined,
  PhoneOutlined
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
  ReferenceLine,
  ReferenceArea
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
      const rawReadings = tempRes.data
      const seen = new Map()
      const deduped = []
      for (const r of rawReadings) {
        const key = `${r.readingTime}_${r.temperature}`
        if (!seen.has(key)) {
          seen.set(key, true)
          deduped.push({
            ...r,
            timeLabel: dayjs(r.readingTime).format('HH:mm:ss'),
            fullTime: r.readingTime
          })
        }
      }
      setReadings(deduped)
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

  const trendAnalysis = useMemo(() => {
    const result = {
      hasWarning: false,
      direction: null,
      consecutiveCount: 0,
      tempChange: 0,
      warningMsg: '',
      recentReadings: []
    }

    if (readings.length < 5 || !device) return result

    const fifteenMinutesAgo = dayjs().subtract(15, 'minute')
    const recentReadings = readings.filter(r => dayjs(r.fullTime).isAfter(fifteenMinutesAgo))

    if (recentReadings.length < 5) {
      result.recentReadings = recentReadings
      return result
    }

    result.recentReadings = recentReadings

    let upCount = 0
    let maxUpCount = 0
    let downCount = 0
    let maxDownCount = 0

    for (let i = 1; i < recentReadings.length; i++) {
      const diff = recentReadings[i].temperature - recentReadings[i - 1].temperature
      if (diff > 0.05) {
        upCount++
        downCount = 0
        maxUpCount = Math.max(maxUpCount, upCount)
      } else if (diff < -0.05) {
        downCount++
        upCount = 0
        maxDownCount = Math.max(maxDownCount, downCount)
      } else {
        upCount = 0
        downCount = 0
      }
    }

    if (maxUpCount >= 4) {
      result.hasWarning = true
      result.direction = 'up'
      result.consecutiveCount = maxUpCount + 1
      const firstIdx = recentReadings.length - maxUpCount - 1
      if (firstIdx >= 0) {
        result.tempChange = recentReadings[recentReadings.length - 1].temperature - recentReadings[firstIdx].temperature
      }
      const distanceToMax = device.maxTemp - lastTemp
      result.warningMsg = `温度连续${result.consecutiveCount}个点上升，累计上升${result.tempChange.toFixed(2)}℃，距离上限仅${distanceToMax.toFixed(2)}℃，建议立即联系司机加强制冷！`
    } else if (maxDownCount >= 4) {
      result.hasWarning = true
      result.direction = 'down'
      result.consecutiveCount = maxDownCount + 1
      const firstIdx = recentReadings.length - maxDownCount - 1
      if (firstIdx >= 0) {
        result.tempChange = recentReadings[recentReadings.length - 1].temperature - recentReadings[firstIdx].temperature
      }
      const distanceToMin = lastTemp - device.minTemp
      result.warningMsg = `温度连续${result.consecutiveCount}个点下降，累计下降${Math.abs(result.tempChange).toFixed(2)}℃，距离下限仅${distanceToMin.toFixed(2)}℃，请注意检查温控设置！`
    }

    return result
  }, [readings, device, lastTemp])

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

            <Card
              title={
                <Space>
                  <LineChartOutlined style={{ color: '#1890ff' }} />
                  <span>温度变化趋势图</span>
                  {trendAnalysis.hasWarning && (
                    <Tag
                      color="orange"
                      icon={<WarningOutlined />}
                      className="alert-flash"
                      style={{ fontSize: 14, padding: '2px 10px' }}
                    >
                      趋势预警
                    </Tag>
                  )}
                </Space>
              }
              extra={<Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>刷新</Button>}
            >
              {trendAnalysis.hasWarning && (
                <Alert
                  message={
                    <Space style={{ fontSize: 16, fontWeight: 'bold' }}>
                      <WarningOutlined style={{ fontSize: 20 }} />
                      {trendAnalysis.direction === 'up' ? '温度持续上升趋势预警' : '温度持续下降趋势预警'}
                    </Space>
                  }
                  description={
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      <p style={{ margin: '8px 0' }}>{trendAnalysis.warningMsg}</p>
                      {trendAnalysis.direction === 'up' && device?.deviceType === 'REFRIGERATED_TRUCK' && (
                        <p style={{ margin: '8px 0' }}>
                          <PhoneOutlined style={{ color: '#fa8c16' }} />
                          &nbsp;建议调度员立即拨打司机电话，要求检查制冷机组并加大冷量！
                        </p>
                      )}
                    </div>
                  }
                  type="warning"
                  showIcon={false}
                  style={{
                    marginBottom: 16,
                    background: '#fffbe6',
                    border: '2px solid #faad14',
                    color: '#ad6800',
                    fontWeight: 'bold'
                  }}
                />
              )}

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
                        domain={['auto', 'auto']}
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
                      {trendAnalysis.recentReadings.length >= 2 && (
                        <ReferenceArea
                          x1={trendAnalysis.recentReadings[0].timeLabel}
                          x2={trendAnalysis.recentReadings[trendAnalysis.recentReadings.length - 1].timeLabel}
                          stroke={trendAnalysis.hasWarning ? '#faad14' : '#bae0ff'}
                          strokeOpacity={0.8}
                          strokeDasharray="3 3"
                          fill={trendAnalysis.hasWarning ? '#fffbe6' : '#e6f7ff'}
                          fillOpacity={0.3}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="temperature"
                        stroke={trendAnalysis.hasWarning && trendAnalysis.direction === 'up' ? '#fa8c16' : '#1890ff'}
                        strokeWidth={trendAnalysis.hasWarning ? 3 : 2}
                        dot={{
                          fill: trendAnalysis.hasWarning && trendAnalysis.direction === 'up' ? '#fa8c16' : '#1890ff',
                          r: 3
                        }}
                        activeDot={{ r: 6 }}
                        name={trendAnalysis.hasWarning ? '温度(℃) ⚠ 趋势预警' : '温度(℃)'}
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
