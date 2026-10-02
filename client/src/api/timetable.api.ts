import { apiClient } from './client';

export const timetableApi = {
  getTimetable: (month: number, year: number, params?: Record<string, string>) =>
    apiClient.get('/timetable', { params: { month, year, ...params } }).then((r) => r.data),

  generateTimetable: (payload: {
    month: number;
    year: number;
    departmentId: string;
    solverWeights?: Record<string, number>;
  }) => apiClient.post('/timetable/generate', payload).then((r) => r.data),

  overrideSession: (id: string, data: { timeSlotId?: string; roomId?: string; date?: string }) =>
    apiClient.put(`/timetable/session/${id}`, data).then((r) => r.data),

  publishSchedule: (scheduleId: string) =>
    apiClient.post('/timetable/publish', { scheduleId }).then((r) => r.data),
};
