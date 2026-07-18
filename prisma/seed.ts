import { PrismaClient, UserRole, MarkingPeriodType, EnrollmentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create a demo school
  const school = await prisma.school.create({
    data: {
      name: "Lincoln High School",
      shortName: "LHS",
      subdomain: "lincoln",
      address: "123 Education Lane",
      city: "Springfield",
      state: "IL",
      zip: "62701",
      country: "US",
      phone: "(555) 123-4567",
      email: "admin@lincoln.edu",
      website: "https://lincoln.edu",
      timezone: "America/Chicago",
    },
  });

  console.log(`Created school: ${school.name} (${school.id})`);

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.create({
    data: {
      schoolId: school.id,
      email: "admin@lincoln.edu",
      name: "School Administrator",
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  console.log(`Created admin user: ${admin.email}`);

  // Create teacher user
  const teacherPassword = await bcrypt.hash("teacher123", 12);
  const teacher = await prisma.user.create({
    data: {
      schoolId: school.id,
      email: "teacher@lincoln.edu",
      name: "John Teacher",
      passwordHash: teacherPassword,
      role: UserRole.TEACHER,
    },
  });

  console.log(`Created teacher user: ${teacher.email}`);

  // Create profiles
  const adminProfile = await prisma.profile.create({
    data: {
      name: "Administrator",
      description: "Full system access",
      isSystem: true,
    },
  });

  const teacherProfile = await prisma.profile.create({
    data: {
      name: "Teacher",
      description: "Teacher access",
      isSystem: true,
    },
  });

  // Create grade levels
  const gradeLevels = await Promise.all(
    ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map(
      (name, index) =>
        prisma.gradeLevel.create({
          data: {
            schoolId: school.id,
            name,
            code: name,
            sortOrder: index,
          },
        })
    )
  );

  console.log(`Created ${gradeLevels.length} grade levels`);

  // Create marking periods
  const currentYear = new Date().getFullYear();
  const academicYear = await prisma.markingPeriod.create({
    data: {
      schoolId: school.id,
      name: `${currentYear}-${currentYear + 1}`,
      type: MarkingPeriodType.YEAR,
      startDate: new Date(`${currentYear}-08-01`),
      endDate: new Date(`${currentYear + 1}-05-31`),
      sortOrder: 0,
    },
  });

  const semester1 = await prisma.markingPeriod.create({
    data: {
      schoolId: school.id,
      name: "Fall Semester",
      type: MarkingPeriodType.SEMESTER,
      startDate: new Date(`${currentYear}-08-01`),
      endDate: new Date(`${currentYear}-12-20`),
      parentId: academicYear.id,
      sortOrder: 0,
    },
  });

  const semester2 = await prisma.markingPeriod.create({
    data: {
      schoolId: school.id,
      name: "Spring Semester",
      type: MarkingPeriodType.SEMESTER,
      startDate: new Date(`${currentYear + 1}-01-05`),
      endDate: new Date(`${currentYear + 1}-05-31`),
      parentId: academicYear.id,
      sortOrder: 1,
    },
  });

  console.log("Created marking periods");

  // Create rooms
  const rooms = await Promise.all(
    ["101", "102", "103", "201", "202", "203", "Gym", "Library"].map((name) =>
      prisma.room.create({
        data: {
          schoolId: school.id,
          name: `Room ${name}`,
          code: name,
          capacity: 30,
        },
      })
    )
  );

  console.log(`Created ${rooms.length} rooms`);

  // Create programs and subjects
  const program = await prisma.program.create({
    data: {
      schoolId: school.id,
      name: "General Education",
      description: "Standard K-12 curriculum",
    },
  });

  const subjects = await Promise.all(
    [
      { name: "Mathematics", code: "MATH" },
      { name: "English Language Arts", code: "ELA" },
      { name: "Science", code: "SCI" },
      { name: "Social Studies", code: "SS" },
      { name: "Physical Education", code: "PE" },
    ].map((data) =>
      prisma.subject.create({
        data: {
          schoolId: school.id,
          programId: program.id,
          ...data,
        },
      })
    )
  );

  console.log(`Created ${subjects.length} subjects`);

  // Create courses
  const courses = await Promise.all([
    prisma.course.create({
      data: {
        schoolId: school.id,
        subjectId: subjects[0].id,
        name: "Algebra I",
        code: "MATH-101",
        description: "Introduction to algebra",
        creditHours: 1,
      },
    }),
    prisma.course.create({
      data: {
        schoolId: school.id,
        subjectId: subjects[1].id,
        name: "English 9",
        code: "ELA-101",
        description: "Freshman English",
        creditHours: 1,
      },
    }),
    prisma.course.create({
      data: {
        schoolId: school.id,
        subjectId: subjects[2].id,
        name: "Biology",
        code: "SCI-101",
        description: "Introduction to biology",
        creditHours: 1,
      },
    }),
  ]);

  console.log(`Created ${courses.length} courses`);

  // Create course sections
  const sections = await Promise.all([
    prisma.courseSection.create({
      data: {
        courseId: courses[0].id,
        schoolId: school.id,
        name: "Algebra I - Period 1",
        academicYear: `${currentYear}-${currentYear + 1}`,
        markingPeriodId: semester1.id,
        roomId: rooms[0].id,
        primaryTeacherId: null,
        maxCapacity: 30,
      },
    }),
    prisma.courseSection.create({
      data: {
        courseId: courses[1].id,
        schoolId: school.id,
        name: "English 9 - Period 2",
        academicYear: `${currentYear}-${currentYear + 1}`,
        markingPeriodId: semester1.id,
        roomId: rooms[1].id,
        primaryTeacherId: null,
        maxCapacity: 30,
      },
    }),
  ]);

  console.log(`Created ${sections.length} course sections`);

  // Create attendance codes
  await prisma.attendanceCode.createMany({
    data: [
      { schoolId: school.id, code: "P", name: "Present", isDefault: true, isPresent: true, sortOrder: 0 },
      { schoolId: school.id, code: "A", name: "Absent", isPresent: false, countsAsAbsent: true, sortOrder: 1 },
      { schoolId: school.id, code: "T", name: "Tardy", isPresent: true, countsAsTardy: true, sortOrder: 2 },
      { schoolId: school.id, code: "E", name: "Excused", isPresent: false, countsAsAbsent: true, sortOrder: 3 },
      { schoolId: school.id, code: "H", name: "Half Day", isPresent: true, sortOrder: 4 },
    ],
  });

  console.log("Created attendance codes");

  // Create grade scale
  const gradeScale = await prisma.gradeScale.create({
    data: {
      schoolId: school.id,
      name: "Standard Grading",
      isDefault: true,
    },
  });

  await prisma.gradeScaleGrade.createMany({
    data: [
      { gradeScaleId: gradeScale.id, letter: "A", percentageMin: 90, percentageMax: 100, numericValue: 4, isPassing: true, sortOrder: 0 },
      { gradeScaleId: gradeScale.id, letter: "B", percentageMin: 80, percentageMax: 89.99, numericValue: 3, isPassing: true, sortOrder: 1 },
      { gradeScaleId: gradeScale.id, letter: "C", percentageMin: 70, percentageMax: 79.99, numericValue: 2, isPassing: true, sortOrder: 2 },
      { gradeScaleId: gradeScale.id, letter: "D", percentageMin: 60, percentageMax: 69.99, numericValue: 1, isPassing: true, sortOrder: 3 },
      { gradeScaleId: gradeScale.id, letter: "F", percentageMin: 0, percentageMax: 59.99, numericValue: 0, isPassing: false, sortOrder: 4 },
    ],
  });

  console.log("Created grade scale");

  // Create assignment types
  await prisma.assignmentType.createMany({
    data: [
      { schoolId: school.id, name: "Homework", weight: 20, sortOrder: 0 },
      { schoolId: school.id, name: "Quiz", weight: 25, sortOrder: 1 },
      { schoolId: school.id, name: "Test", weight: 35, sortOrder: 2 },
      { schoolId: school.id, name: "Project", weight: 20, sortOrder: 3 },
    ],
  });

  console.log("Created assignment types");

  // Create demo students
  const students = [];
  for (let i = 1; i <= 10; i++) {
    const student = await prisma.student.create({
      data: {
        schoolId: school.id,
        firstName: `Student`,
        lastName: `${i.toString().padStart(2, "0")}`,
        dateOfBirth: new Date(`2010-${(i % 12) + 1}-${(i % 28) + 1}`),
        gender: i % 2 === 0 ? "Male" : "Female",
        homeAddress: `${100 + i} Student Lane`,
        homeCity: "Springfield",
        homeState: "IL",
        homeZip: "62701",
      },
    });

    // Create enrollment
    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        schoolId: school.id,
        gradeLevelId: gradeLevels[9 + (i % 4)].id, // Grades 9-12
        academicYear: `${currentYear}-${currentYear + 1}`,
        entryDate: new Date(`${currentYear}-08-15`),
        status: EnrollmentStatus.ACTIVE,
        enrollmentType: "NEW",
      },
    });

    // Create fee account
    await prisma.feeAccount.create({
      data: {
        schoolId: school.id,
        studentId: student.id,
        totalDue: 150.0,
        totalPaid: i % 3 === 0 ? 150.0 : 0,
        balance: i % 3 === 0 ? 0 : 150.0,
      },
    });

    students.push(student);
  }

  console.log(`Created ${students.length} students`);

  // Create demo staff
  const staffMembers = await Promise.all([
    prisma.staff.create({
      data: {
        schoolId: school.id,
        userId: teacher.id,
        firstName: "John",
        lastName: "Teacher",
        gender: "Male",
      },
    }),
    prisma.staff.create({
      data: {
        schoolId: school.id,
        firstName: "Jane",
        lastName: "Smith",
        gender: "Female",
      },
    }),
  ]);

  console.log(`Created ${staffMembers.length} staff members`);

  // Assign teacher to sections
  await prisma.courseSection.update({
    where: { id: sections[0].id },
    data: { primaryTeacherId: staffMembers[0].id },
  });

  await prisma.courseSection.update({
    where: { id: sections[1].id },
    data: { primaryTeacherId: staffMembers[1].id },
  });

  console.log("Assigned teachers to sections");

  // Create calendar
  const calendar = await prisma.calendar.create({
    data: {
      schoolId: school.id,
      name: "Standard Calendar",
      isDefault: true,
    },
  });

  // Create some calendar events
  await prisma.calendarEvent.createMany({
    data: [
      {
        calendarId: calendar.id,
        title: "First Day of School",
        eventType: "holiday",
        startDate: new Date(`${currentYear}-08-15`),
        endDate: new Date(`${currentYear}-08-15`),
        isAllDay: true,
      },
      {
        calendarId: calendar.id,
        title: "Labor Day",
        eventType: "holiday",
        startDate: new Date(`${currentYear}-09-02`),
        endDate: new Date(`${currentYear}-09-02`),
        isAllDay: true,
      },
      {
        calendarId: calendar.id,
        title: "Thanksgiving Break",
        eventType: "holiday",
        startDate: new Date(`${currentYear}-11-25`),
        endDate: new Date(`${currentYear}-11-29`),
        isAllDay: true,
      },
    ],
  });

  console.log("Created calendar events");

  console.log("\nSeed completed successfully!");
  console.log("\nDemo credentials:");
  console.log("  Admin: admin@lincoln.edu / admin123");
  console.log("  Teacher: teacher@lincoln.edu / teacher123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
