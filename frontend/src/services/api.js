import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

export const deviceApi = {
  getAll: () => api.get('/devices'),
  getById: (id) => api.get(`/devices/${id}`),
  register: (data) => api.post('/devices', data)
}

export const temperatureApi = {
  report: (data) => api.post('/temperature/report', data),
  getLastHour: (deviceId) => api.get(`/temperature/device/${deviceId}/last-hour`)
}

export const alertApi = {
  getAll: () => api.get('/alerts'),
  getUnacknowledged: () => api.get('/alerts/unacknowledged'),
  acknowledge: (id) => api.post(`/alerts/${id}/acknowledge`)
}

export default api
