export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  avatarUrl?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Teacher {
  id: string;
  userId: string;
  departmentId: string;
  designation?: string;
  maxWeeklyLoad: number;
  preferences?: Record<string, unknown>;
  user: { id: string; name: string; email: string };
  department?: Department;
}

export interface Batch {
  id: string;
  name: string;
  departmentId: string;
  semester: number;
  size: number;
  department?: Department;
  _count?: { students: number };
}

export interface Course {
  id: string;
  name: string;
  code: string;
  credits: number;
  weeklyHours: number;
  type: 'THEORY' | 'LAB' | 'TUTORIAL' | 'SEMINAR';
  departmentId: string;
  department?: Department;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  type: 'LECTURE_HALL' | 'COMPUTER_LAB' | 'SCIENCE_LAB' | 'AUDITORIUM' | 'SEMINAR_ROOM';
  equipment?: Record<string, unknown>;
}

export interface TimeSlot {
  id: string;
  dayOfWeek: number;
  slotNumber: number;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  desirabilityScore: number;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  isGazetted: boolean;
}

export interface Event {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  blocksSchedule: boolean;
}

export interface Schedule {
  id: string;
  name: string;
  month: number;
  year: number;
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  fairnessGini?: number;
}

export interface Session {
  id: string;
  scheduleId: string;
  courseId: string;
  teacherId: string;
  batchId: string;
  roomId: string;
  timeSlotId: string;
  date: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED_HOLIDAY' | 'CANCELLED_EVENT' | 'RESCHEDULED';
  course: Course;
  teacher: Teacher;
  batch: Batch;
  room: Room;
  timeSlot: TimeSlot;
  productivity?: ProductivityScore;
}

export interface Attendance {
  id: string;
  sessionId: string;
  studentId: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  markedVia?: string;
  markedAt: string;
}

export interface ProductivityScore {
  id: string;
  sessionId: string;
  attendanceRate: number;
  engagementScore: number;
  learningScore: number;
  feedbackScore: number;
  compositeScore: number;
  computedAt: string;
}

export interface DashboardStats {
  totalTeachers: number;
  totalStudents: number;
  totalCourses: number;
  totalSessions: number;
  publishedSchedules: number;
}

export interface FairnessData {
  overallGini: number | null;
  averageUndesirableSlots: number;
  teacherDistribution: TeacherFairnessEntry[];
}

export interface TeacherFairnessEntry {
  teacherId: string;
  teacherName: string;
  totalHours: number;
  undesirableSlotCount: number;
  desirabilityIndexAverage: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: { code: string; message: string };
}
