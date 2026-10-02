import { PrismaClient, Role, CourseType, RoomType, AttendanceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ------------------------------------------------
  // 1. Department
  // ------------------------------------------------
  const dept = await prisma.department.upsert({
    where: { code: 'CSE' },
    update: {},
    create: { name: 'Computer Science & Engineering', code: 'CSE' },
  });
  console.log('✅ Department created:', dept.code);

  // ------------------------------------------------
  // 2. Users + Teacher profiles
  // ------------------------------------------------
  const teacherData = [
    { name: 'Dr. Ada Lovelace', email: 'lovelace@college.edu', designation: 'Professor', maxWeeklyLoad: 16, preferences: { avoidEarlySlots: true, preferredDays: [1, 2, 3] } },
    { name: 'Prof. Alan Turing', email: 'turing@college.edu', designation: 'Associate Professor', maxWeeklyLoad: 18, preferences: {} },
    { name: 'Dr. Grace Hopper', email: 'hopper@college.edu', designation: 'Professor', maxWeeklyLoad: 14, preferences: { avoidLastSlot: true } },
    { name: 'Prof. Donald Knuth', email: 'knuth@college.edu', designation: 'Assistant Professor', maxWeeklyLoad: 20, preferences: {} },
    { name: 'Dr. Barbara Liskov', email: 'liskov@college.edu', designation: 'Associate Professor', maxWeeklyLoad: 16, preferences: {} },
    { name: 'Prof. Edsger Dijkstra', email: 'dijkstra@college.edu', designation: 'Assistant Professor', maxWeeklyLoad: 20, preferences: {} },
    { name: 'Dr. John McCarthy', email: 'mccarthy@college.edu', designation: 'Associate Professor', maxWeeklyLoad: 18, preferences: {} },
    { name: 'Prof. Linus Torvalds', email: 'torvalds@college.edu', designation: 'Visiting Professor', maxWeeklyLoad: 12, preferences: { avoidEarlySlots: true } },
  ];

  const teacherPassword = await bcrypt.hash('TeacherPass123!', 10);
  const teachers: { id: string }[] = [];

  for (const td of teacherData) {
    const user = await prisma.user.upsert({
      where: { email: td.email },
      update: {},
      create: { email: td.email, passwordHash: teacherPassword, name: td.name, role: Role.TEACHER },
    });
    const teacher = await prisma.teacher.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        departmentId: dept.id,
        designation: td.designation,
        maxWeeklyLoad: td.maxWeeklyLoad,
        preferences: td.preferences,
      },
    });
    teachers.push(teacher);
  }
  console.log('✅ Teachers created:', teachers.length);

  // ------------------------------------------------
  // 3. Admin user
  // ------------------------------------------------
  const adminPass = await bcrypt.hash('AdminPass123!', 10);
  await prisma.user.upsert({
    where: { email: 'admin@college.edu' },
    update: {},
    create: { email: 'admin@college.edu', passwordHash: adminPass, name: 'System Administrator', role: Role.ADMIN },
  });
  console.log('✅ Admin created');

  // ------------------------------------------------
  // 4. Batches
  // ------------------------------------------------
  const batchData = [
    { name: 'CS-Year2-A', semester: 3, size: 60 },
    { name: 'CS-Year2-B', semester: 3, size: 58 },
    { name: 'CS-Year3-A', semester: 5, size: 55 },
    { name: 'CS-Year3-B', semester: 5, size: 52 },
  ];

  const batches: { id: string }[] = [];
  for (const bd of batchData) {
    const batch = await prisma.batch.upsert({
      where: { name_departmentId: { name: bd.name, departmentId: dept.id } } as any,
      update: {},
      create: { name: bd.name, departmentId: dept.id, semester: bd.semester, size: bd.size },
    });
    batches.push(batch);
  }
  console.log('✅ Batches created:', batches.length);

  // ------------------------------------------------
  // 5. Students
  // ------------------------------------------------
  const studentPass = await bcrypt.hash('StudentPass123!', 10);
  const studentBatch = batches[0];
  const studentUser = await prisma.user.upsert({
    where: { email: 'student1@college.edu' },
    update: {},
    create: { email: 'student1@college.edu', passwordHash: studentPass, name: 'Alice Johnson', role: Role.STUDENT },
  });
  await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: { userId: studentUser.id, batchId: studentBatch.id, rollNumber: 'CS2024001' },
  });
  console.log('✅ Sample student created');

  // ------------------------------------------------
  // 6. Courses
  // ------------------------------------------------
  const courseData = [
    { name: 'Data Structures & Algorithms', code: 'CS301', credits: 4, weeklyHours: 4, type: CourseType.THEORY },
    { name: 'Database Management Systems', code: 'CS302', credits: 3, weeklyHours: 3, type: CourseType.THEORY },
    { name: 'Operating Systems', code: 'CS303', credits: 4, weeklyHours: 4, type: CourseType.THEORY },
    { name: 'Computer Networks', code: 'CS304', credits: 3, weeklyHours: 3, type: CourseType.THEORY },
    { name: 'Software Engineering', code: 'CS401', credits: 3, weeklyHours: 3, type: CourseType.THEORY },
    { name: 'Artificial Intelligence', code: 'CS402', credits: 4, weeklyHours: 4, type: CourseType.THEORY },
    { name: 'Web Technologies', code: 'CS403', credits: 3, weeklyHours: 3, type: CourseType.THEORY },
    { name: 'Machine Learning', code: 'CS404', credits: 4, weeklyHours: 4, type: CourseType.THEORY },
    { name: 'DBMS Lab', code: 'CS302L', credits: 2, weeklyHours: 2, type: CourseType.LAB },
    { name: 'Networks Lab', code: 'CS304L', credits: 2, weeklyHours: 2, type: CourseType.LAB },
    { name: 'AI Lab', code: 'CS402L', credits: 2, weeklyHours: 2, type: CourseType.LAB },
    { name: 'Web Dev Lab', code: 'CS403L', credits: 2, weeklyHours: 2, type: CourseType.LAB },
  ];

  const courses: { id: string; type: CourseType }[] = [];
  for (const cd of courseData) {
    const course = await prisma.course.upsert({
      where: { code: cd.code },
      update: {},
      create: { ...cd, departmentId: dept.id },
    });
    courses.push({ id: course.id, type: course.type });
  }
  console.log('✅ Courses created:', courses.length);

  // ------------------------------------------------
  // 7. Rooms
  // ------------------------------------------------
  const roomData = [
    { name: 'LH-101', capacity: 80, type: RoomType.LECTURE_HALL },
    { name: 'LH-102', capacity: 80, type: RoomType.LECTURE_HALL },
    { name: 'LH-201', capacity: 75, type: RoomType.LECTURE_HALL },
    { name: 'LH-202', capacity: 75, type: RoomType.LECTURE_HALL },
    { name: 'CL-01', capacity: 60, type: RoomType.COMPUTER_LAB, equipment: { workstations: 60, hasProjector: true } },
    { name: 'CL-02', capacity: 60, type: RoomType.COMPUTER_LAB, equipment: { workstations: 60, hasProjector: true } },
    { name: 'SR-01', capacity: 40, type: RoomType.SEMINAR_ROOM },
    { name: 'SR-02', capacity: 40, type: RoomType.SEMINAR_ROOM },
  ];

  const rooms: { id: string; type: RoomType }[] = [];
  for (const rd of roomData) {
    const room = await prisma.room.upsert({
      where: { name: rd.name },
      update: {},
      create: { ...rd, departmentId: dept.id } as any,
    });
    rooms.push({ id: room.id, type: room.type });
  }
  console.log('✅ Rooms created:', rooms.length);

  // ------------------------------------------------
  // 8. TimeSlots (Mon–Fri, 7 slots per day)
  // ------------------------------------------------
  const slotDefinitions = [
    { slotNumber: 1, startTime: '08:30', endTime: '09:30', desirabilityScore: 2.0 },
    { slotNumber: 2, startTime: '09:30', endTime: '10:30', desirabilityScore: 5.0 },
    { slotNumber: 3, startTime: '10:45', endTime: '11:45', desirabilityScore: 5.0 },
    { slotNumber: 4, startTime: '11:45', endTime: '12:45', desirabilityScore: 4.0 },
    { slotNumber: 5, startTime: '13:45', endTime: '14:45', desirabilityScore: 3.5, isBreak: false },
    { slotNumber: 6, startTime: '14:45', endTime: '15:45', desirabilityScore: 3.0 },
    { slotNumber: 7, startTime: '15:45', endTime: '16:45', desirabilityScore: 1.5 },
  ];

  const timeSlots: { id: string; slotNumber: number; desirabilityScore: number }[] = [];
  for (let day = 1; day <= 5; day++) {
    for (const slot of slotDefinitions) {
      const ts = await prisma.timeSlot.upsert({
        where: { dayOfWeek_slotNumber: { dayOfWeek: day, slotNumber: slot.slotNumber } },
        update: {},
        create: {
          dayOfWeek: day,
          slotNumber: slot.slotNumber,
          startTime: slot.startTime,
          endTime: slot.endTime,
          desirabilityScore: slot.desirabilityScore,
          isBreak: slot.isBreak ?? false,
        },
      });
      timeSlots.push({ id: ts.id, slotNumber: ts.slotNumber, desirabilityScore: ts.desirabilityScore });
    }
  }
  console.log('✅ TimeSlots created:', timeSlots.length);

  // ------------------------------------------------
  // 9. Academic Calendar
  // ------------------------------------------------
  await prisma.academicCalendar.upsert({
    where: { id: 'seed-calendar-1' },
    update: {},
    create: {
      id: 'seed-calendar-1',
      academicYear: '2026-2027',
      semester: 1,
      startDate: new Date('2026-08-01'),
      endDate: new Date('2027-01-15'),
      isActive: true,
    },
  });

  // ------------------------------------------------
  // 10. Holidays
  // ------------------------------------------------
  const holidays = [
    { name: 'Gandhi Jayanti', date: new Date('2026-10-02') },
    { name: 'Diwali Break', date: new Date('2026-10-20') },
    { name: 'Diwali Break Day 2', date: new Date('2026-10-21') },
    { name: 'Christmas', date: new Date('2026-12-25') },
  ];
  for (const h of holidays) {
    await prisma.holiday.upsert({
      where: { date: h.date },
      update: {},
      create: { name: h.name, date: h.date, isGazetted: true },
    });
  }
  console.log('✅ Holidays created:', holidays.length);

  // ------------------------------------------------
  // 11. Constraints
  // ------------------------------------------------
  const constraints = [
    { name: 'NO_TEACHER_DOUBLE_BOOKING', type: 'HARD' as const, description: 'A teacher cannot teach two sessions simultaneously', weight: 1.0 },
    { name: 'NO_ROOM_DOUBLE_BOOKING', type: 'HARD' as const, description: 'A room cannot host two sessions simultaneously', weight: 1.0 },
    { name: 'NO_BATCH_OVERLAP', type: 'HARD' as const, description: 'A batch cannot attend two sessions simultaneously', weight: 1.0 },
    { name: 'MAX_CONSECUTIVE_LECTURES', type: 'HARD' as const, description: 'No teacher may teach more than 3 consecutive slots', weight: 1.0, parameters: { max: 3 } },
    { name: 'MANDATORY_LUNCH_BREAK', type: 'HARD' as const, description: 'Slot 12:45–13:45 is reserved as lunch break', weight: 1.0 },
    { name: 'TEACHER_FAIRNESS', type: 'SOFT' as const, description: 'Balance undesirable slots across teachers', weight: 10.0 },
    { name: 'MAXIMIZE_ATTENDANCE', type: 'SOFT' as const, description: 'Schedule high-priority courses in high-attendance slots', weight: 8.0 },
    { name: 'TEACHER_PREFERENCE', type: 'SOFT' as const, description: 'Respect teacher slot preferences', weight: 5.0 },
  ];

  for (const c of constraints) {
    await prisma.constraint.upsert({
      where: { name: c.name },
      update: {},
      create: c as any,
    });
  }
  console.log('✅ Constraints created:', constraints.length);

  console.log('\n🎉 Seeding complete!');
  console.log('📧 Admin:   admin@college.edu  / AdminPass123!');
  console.log('📧 Teacher: turing@college.edu / TeacherPass123!');
  console.log('📧 Student: student1@college.edu / StudentPass123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
