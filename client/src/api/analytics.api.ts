import { apiClient } from './client';

export const analyticsApi = {
  getStats: () => apiClient.get('/analytics/stats').then((r) => r.data),
  getFairness: (month: number, year: number) =>
    apiClient.get('/analytics/fairness', { params: { month, year } }).then((r) => r.data),
  getAttendanceTrends: () =>
    apiClient.get('/analytics/attendance-trends').then((r) => r.data),
  getProductivity: (params?: Record<string, string>) =>
    apiClient.get('/analytics/productivity', { params }).then((r) => r.data),
};

export const resourceApi = {
  getDepartments: () => apiClient.get('/departments').then((r) => r.data),
  getTeachers: () => apiClient.get('/teachers').then((r) => r.data),
  getBatches: () => apiClient.get('/batches').then((r) => r.data),
  getCourses: () => apiClient.get('/courses').then((r) => r.data),
  getRooms: () => apiClient.get('/rooms').then((r) => r.data),
  getTimeSlots: () => apiClient.get('/time-slots').then((r) => r.data),
  getHolidays: () => apiClient.get('/holidays').then((r) => r.data),
  getEvents: () => apiClient.get('/events').then((r) => r.data),

  createHoliday: (data: { name: string; date: string }) =>
    apiClient.post('/holidays', data).then((r) => r.data),
  deleteHoliday: (id: string) => apiClient.delete(`/holidays/${id}`).then((r) => r.data),
  createEvent: (data: { name: string; startDate: string; endDate: string }) =>
    apiClient.post('/events', data).then((r) => r.data),
};

export const attendanceApi = {
  startQr: (sessionId: string) =>
    apiClient.post(`/attendance/session/${sessionId}/start-qr`).then((r) => r.data),
  scanQr: (payload: string) =>
    apiClient.post('/attendance/scan-qr', { payload }).then((r) => r.data),
  bulkMark: (sessionId: string, records: { studentId: string; status: string }[]) =>
    apiClient.post('/attendance/bulk', { sessionId, records }).then((r) => r.data),
  getSessionAttendance: (sessionId: string) =>
    apiClient.get(`/attendance/session/${sessionId}`).then((r) => r.data),
  getMyAttendance: () =>
    apiClient.get('/attendance/student/me').then((r) => r.data),
  submitEngagement: (data: { sessionId: string; type: string; score: number; totalPrompt?: string }) =>
    apiClient.post('/attendance/engagement', data).then((r) => r.data),
  submitFeedback: (data: { sessionId: string; rating: number; tags?: string[]; comment?: string }) =>
    apiClient.post('/attendance/feedback', data).then((r) => r.data),
  computeProductivity: (data: {
    sessionId: string;
    attendanceRate: number;
    engagementScore: number;
    learningScore: number;
    feedbackScore: number;
  }) => apiClient.post('/attendance/productivity', data).then((r) => r.data),
};
