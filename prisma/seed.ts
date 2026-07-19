import { PrismaClient, UserRole, MarkingPeriodType, EnrollmentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const schools = [
  {
    name: "Holy Trinity Secondary School",
    shortName: "HTSS",
    subdomain: "holy-trinity-kenema",
    address: "27 Hangha Road",
    city: "Kenema",
    state: "Eastern Province",
    country: "SL",
    phone: "+232-76-123456",
    email: "admin@holytrinity.edu.sl",
    website: "https://holytrinity.edu.sl",
    timezone: "Africa/Freetown",
  },
  {
    name: "Sierra Leone Grammar School",
    shortName: "SLGS",
    subdomain: "grammar-school",
    address: "17 Sanders Street",
    city: "Freetown",
    state: "Western Area",
    country: "SL",
    phone: "+232-77-234567",
    email: "admin@slgs.edu.sl",
    website: "https://slgs.edu.sl",
    timezone: "Africa/Freetown",
  },
  {
    name: "St. Edward's Secondary School",
    shortName: "SESS",
    subdomain: "st-edwards",
    address: "8 Wellington Street",
    city: "Freetown",
    state: "Western Area",
    country: "SL",
    phone: "+232-78-345678",
    email: "admin@stedwards.edu.sl",
    website: "https://stedwards.edu.sl",
    timezone: "Africa/Freetown",
  },
  {
    name: "Government Secondary School Bo",
    shortName: "GSSB",
    subdomain: "govt-secondary-bo",
    address: "34 Boom Road",
    city: "Bo",
    state: "Southern Province",
    country: "SL",
    phone: "+232-79-456789",
    email: "admin@gssbo.edu.sl",
    website: "https://gssbo.edu.sl",
    timezone: "Africa/Freetown",
  },
  {
    name: "Ahmadiyya Muslim Secondary School",
    shortName: "AMSS",
    subdomain: "ahmadiyya-muslim",
    address: "12 Lumley Beach Road",
    city: "Freetown",
    state: "Western Area",
    country: "SL",
    phone: "+232-76-567890",
    email: "admin@ahmadiyya.edu.sl",
    website: "https://ahmadiyya.edu.sl",
    timezone: "Africa/Freetown",
  },
];

const maleNames = [
  { first: "Mohamed", last: "Kamara" },
  { first: "Ibrahim", last: "Conteh" },
  { first: "Amadu", last: "Bangura" },
  { first: "Alpha", last: "Sesay" },
  { first: "Ishmael", last: "Turay" },
  { first: "Sorie", last: "Koroma" },
  { first: "Abu", last: "Mansaray" },
  { first: "Lansana", last: "Fofanah" },
  { first: "Saidu", last: "Marah" },
  { first: "Musa", last: "Kargbo" },
  { first: "Foday", last: "Bah" },
  { first: "Sulaiman", last: "Sawaneh" },
];

const femaleNames = [
  { first: "Fatmata", last: "Kamara" },
  { first: "Aminata", last: "Conteh" },
  { first: "Isata", last: "Bangura" },
  { first: "Kadiatu", last: "Sesay" },
  { first: "Adama", last: "Turay" },
  { first: "Mariama", last: "Koroma" },
  { first: "Hindolo", last: "Mansaray" },
  { first: "Memunatu", last: "Fofanah" },
  { first: "Mabinty", last: "Marah" },
  { first: "Rugiatu", last: "Kargbo" },
  { first: "Kadija", last: "Bah" },
  { first: "Aisha", last: "Sawaneh" },
];

const subjects = [
  { name: "Mathematics", code: "MATH" },
  { name: "English Language", code: "ENG" },
  { name: "Biology", code: "BIO" },
  { name: "Physics", code: "PHY" },
  { name: "Chemistry", code: "CHEM" },
  { name: "Geography", code: "GEO" },
  { name: "History", code: "HIST" },
  { name: "Agricultural Science", code: "AGRI" },
];

const cities = ["Freetown", "Bo", "Kenema", "Makeni", "Koidu"];

async function main() {
  console.log("Seeding LeoneSIS database...\n");

  const adminPassword = await bcrypt.hash("admin123", 12);
  const teacherPassword = await bcrypt.hash("teacher123", 12);

  const currentYear = new Date().getFullYear();

  for (const schoolData of schools) {
    console.log(`\n--- Creating ${schoolData.name} ---`);

    const school = await prisma.school.create({ data: schoolData });
    console.log(`  School created: ${school.name}`);

    // Admin
    const adminUsername = `${schoolData.shortName.toLowerCase()}admin`;
    await prisma.user.create({
      data: {
        schoolId: school.id,
        username: adminUsername,
        email: schoolData.email,
        name: "Administrator",
        passwordHash: adminPassword,
        role: UserRole.ADMIN,
      },
    });
    console.log(`  Admin created: ${adminUsername} / admin123`);

    // Teachers
    const teacherList = [
      { first: "James", last: "Kamara" },
      { first: "Sarah", last: "Conteh" },
      { first: "David", last: "Bangura" },
    ];
    const teachers = await Promise.all(
      teacherList.map((t, i) =>
        prisma.user.create({
          data: {
            schoolId: school.id,
            username: `teacher${i + 1}`,
            email: `${t.first.toLowerCase()}.${t.last.toLowerCase()}@${schoolData.subdomain}.edu.sl`,
            name: `${t.first} ${t.last}`,
            passwordHash: teacherPassword,
            role: UserRole.TEACHER,
          },
        })
      )
    );
    console.log(`  Teachers created: teacher1/teacher123, teacher2/teacher123, teacher3/teacher123`);

    // Staff
    const staffMembers = await Promise.all(
      teachers.map((t) =>
        prisma.staff.create({
          data: {
            schoolId: school.id,
            userId: t.id,
            firstName: t.name.split(" ")[0],
            lastName: t.name.split(" ")[1],
            gender: t.name === "Sarah Conteh" ? "Female" : "Male",
          },
        })
      )
    );
    console.log(`  Created ${staffMembers.length} teachers`);

    // Grade levels (7-12 for secondary school)
    const gradeLevels = await Promise.all(
      ["7", "8", "9", "10", "11", "12"].map((name, index) =>
        prisma.gradeLevel.create({
          data: {
            schoolId: school.id,
            name,
            code: `Form ${name}`,
            sortOrder: index,
          },
        })
      )
    );
    console.log(`  Created ${gradeLevels.length} grade levels`);

    // Marking periods
    const academicYear = await prisma.markingPeriod.create({
      data: {
        schoolId: school.id,
        name: `${currentYear}-${currentYear + 1}`,
        type: MarkingPeriodType.YEAR,
        startDate: new Date(`${currentYear}-09-01`),
        endDate: new Date(`${currentYear + 1}-07-15`),
        sortOrder: 0,
      },
    });

    const term1 = await prisma.markingPeriod.create({
      data: {
        schoolId: school.id,
        name: "Term 1",
        type: MarkingPeriodType.SEMESTER,
        startDate: new Date(`${currentYear}-09-01`),
        endDate: new Date(`${currentYear}-12-15`),
        parentId: academicYear.id,
        sortOrder: 0,
      },
    });

    const term2 = await prisma.markingPeriod.create({
      data: {
        schoolId: school.id,
        name: "Term 2",
        type: MarkingPeriodType.SEMESTER,
        startDate: new Date(`${currentYear + 1}-01-06`),
        endDate: new Date(`${currentYear + 1}-04-10`),
        parentId: academicYear.id,
        sortOrder: 1,
      },
    });

    const term3 = await prisma.markingPeriod.create({
      data: {
        schoolId: school.id,
        name: "Term 3",
        type: MarkingPeriodType.SEMESTER,
        startDate: new Date(`${currentYear + 1}-04-20`),
        endDate: new Date(`${currentYear + 1}-07-15`),
        parentId: academicYear.id,
        sortOrder: 2,
      },
    });
    console.log("  Created marking periods (3 terms)");

    // Rooms
    const rooms = await Promise.all(
      ["A", "B", "C", "D", "E", "Lab", "Comp Lab", "Hall"].map((name) =>
        prisma.room.create({
          data: {
            schoolId: school.id,
            name: `Room ${name}`,
            code: name,
            capacity: 45,
          },
        })
      )
    );
    console.log(`  Created ${rooms.length} rooms`);

    // Program
    const program = await prisma.program.create({
      data: {
        schoolId: school.id,
        name: "WAEC Standard Curriculum",
        description: "West African Examinations Council standard curriculum",
      },
    });

    // Subjects
    const subjectRecords = await Promise.all(
      subjects.map((data) =>
        prisma.subject.create({
          data: {
            schoolId: school.id,
            programId: program.id,
            ...data,
          },
        })
      )
    );
    console.log(`  Created ${subjectRecords.length} subjects`);

    // Courses
    const courses = await Promise.all([
      prisma.course.create({
        data: {
          schoolId: school.id,
          subjectId: subjectRecords[0].id,
          name: "Further Mathematics",
          code: "MATH-201",
          description: "Advanced mathematics for WASSCE",
          creditHours: 1,
        },
      }),
      prisma.course.create({
        data: {
          schoolId: school.id,
          subjectId: subjectRecords[1].id,
          name: "English Language",
          code: "ENG-201",
          description: "English language arts",
          creditHours: 1,
        },
      }),
      prisma.course.create({
        data: {
          schoolId: school.id,
          subjectId: subjectRecords[2].id,
          name: "Biology",
          code: "BIO-201",
          description: "General biology",
          creditHours: 1,
        },
      }),
      prisma.course.create({
        data: {
          schoolId: school.id,
          subjectId: subjectRecords[3].id,
          name: "Physics",
          code: "PHY-201",
          description: "General physics",
          creditHours: 1,
        },
      }),
      prisma.course.create({
        data: {
          schoolId: school.id,
          subjectId: subjectRecords[4].id,
          name: "Chemistry",
          code: "CHEM-201",
          description: "General chemistry",
          creditHours: 1,
        },
      }),
    ]);
    console.log(`  Created ${courses.length} courses`);

    // Course sections
    const sections = await Promise.all([
      prisma.courseSection.create({
        data: {
          courseId: courses[0].id,
          schoolId: school.id,
          name: "Further Maths - Form 10A",
          academicYear: `${currentYear}-${currentYear + 1}`,
          markingPeriodId: term1.id,
          roomId: rooms[0].id,
          primaryTeacherId: staffMembers[0].id,
          maxCapacity: 45,
        },
      }),
      prisma.courseSection.create({
        data: {
          courseId: courses[1].id,
          schoolId: school.id,
          name: "English - Form 10B",
          academicYear: `${currentYear}-${currentYear + 1}`,
          markingPeriodId: term1.id,
          roomId: rooms[1].id,
          primaryTeacherId: staffMembers[1].id,
          maxCapacity: 45,
        },
      }),
      prisma.courseSection.create({
        data: {
          courseId: courses[2].id,
          schoolId: school.id,
          name: "Biology - Form 11A",
          academicYear: `${currentYear}-${currentYear + 1}`,
          markingPeriodId: term1.id,
          roomId: rooms[2].id,
          primaryTeacherId: staffMembers[2].id,
          maxCapacity: 40,
        },
      }),
    ]);
    console.log(`  Created ${sections.length} course sections`);

    // Attendance codes
    await prisma.attendanceCode.createMany({
      data: [
        { schoolId: school.id, code: "P", name: "Present", isDefault: true, isPresent: true, sortOrder: 0 },
        { schoolId: school.id, code: "A", name: "Absent", isPresent: false, countsAsAbsent: true, sortOrder: 1 },
        { schoolId: school.id, code: "T", name: "Tardy", isPresent: true, countsAsTardy: true, sortOrder: 2 },
        { schoolId: school.id, code: "E", name: "Excused", isPresent: false, countsAsAbsent: true, sortOrder: 3 },
        { schoolId: school.id, code: "H", name: "Half Day", isPresent: true, sortOrder: 4 },
      ],
    });

    // Grade scale
    const gradeScale = await prisma.gradeScale.create({
      data: {
        schoolId: school.id,
        name: "WAEC Grading",
        isDefault: true,
      },
    });

    await prisma.gradeScaleGrade.createMany({
      data: [
        { gradeScaleId: gradeScale.id, letter: "A1", percentageMin: 75, percentageMax: 100, numericValue: 4, isPassing: true, sortOrder: 0 },
        { gradeScaleId: gradeScale.id, letter: "B2", percentageMin: 70, percentageMax: 74.99, numericValue: 3.5, isPassing: true, sortOrder: 1 },
        { gradeScaleId: gradeScale.id, letter: "B3", percentageMin: 65, percentageMax: 69.99, numericValue: 3, isPassing: true, sortOrder: 2 },
        { gradeScaleId: gradeScale.id, letter: "C4", percentageMin: 60, percentageMax: 64.99, numericValue: 2.5, isPassing: true, sortOrder: 3 },
        { gradeScaleId: gradeScale.id, letter: "C5", percentageMin: 55, percentageMax: 59.99, numericValue: 2, isPassing: true, sortOrder: 4 },
        { gradeScaleId: gradeScale.id, letter: "C6", percentageMin: 50, percentageMax: 54.99, numericValue: 1.5, isPassing: true, sortOrder: 5 },
        { gradeScaleId: gradeScale.id, letter: "D7", percentageMin: 45, percentageMax: 49.99, numericValue: 1, isPassing: true, sortOrder: 6 },
        { gradeScaleId: gradeScale.id, letter: "E8", percentageMin: 40, percentageMax: 44.99, numericValue: 0.5, isPassing: false, sortOrder: 7 },
        { gradeScaleId: gradeScale.id, letter: "F9", percentageMin: 0, percentageMax: 39.99, numericValue: 0, isPassing: false, sortOrder: 8 },
      ],
    });

    // Assignment types
    await prisma.assignmentType.createMany({
      data: [
        { schoolId: school.id, name: "Homework", weight: 15, sortOrder: 0 },
        { schoolId: school.id, name: "Quiz", weight: 15, sortOrder: 1 },
        { schoolId: school.id, name: "Mid-Term Exam", weight: 30, sortOrder: 2 },
        { schoolId: school.id, name: "Project", weight: 10, sortOrder: 3 },
        { schoolId: school.id, name: "Final Exam", weight: 30, sortOrder: 4 },
      ],
    });

    // Students
    const studentsCount = 25;
    for (let i = 0; i < studentsCount; i++) {
      const isMale = i % 2 === 0;
      const namePool = isMale ? maleNames : femaleNames;
      const name = namePool[i % namePool.length];

      const gradeIndex = Math.floor(i / 5) % gradeLevels.length;
      const gradeLevel = gradeLevels[gradeIndex];

      const birthYear = 2008 - gradeIndex;
      const month = ((i * 7) % 12) + 1;
      const day = ((i * 11) % 28) + 1;

      const city = cities[i % cities.length];

      const student = await prisma.student.create({
        data: {
          schoolId: school.id,
          firstName: name.first,
          lastName: name.last,
          gender: isMale ? "Male" : "Female",
          dateOfBirth: new Date(`${birthYear}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`),
          primaryLanguage: "Krio",
          homeAddress: `${100 + i} Main Street`,
          homeCity: city,
          homeState: city === "Freetown" ? "Western Area" : city === "Bo" ? "Southern Province" : city === "Kenema" ? "Eastern Province" : "Northern Province",
          homeCountry: "SL",
        },
      });

      // Enrollment
      await prisma.enrollment.create({
        data: {
          studentId: student.id,
          schoolId: school.id,
          gradeLevelId: gradeLevel.id,
          academicYear: `${currentYear}-${currentYear + 1}`,
          entryDate: new Date(`${currentYear}-09-01`),
          status: EnrollmentStatus.ACTIVE,
          enrollmentType: "NEW",
        },
      });

      // Fee account (in Leones)
      const totalDue = 150000 + i * 5000;
      const totalPaid = i % 4 === 0 ? totalDue : i % 3 === 0 ? totalDue * 0.5 : 0;
      await prisma.feeAccount.create({
        data: {
          schoolId: school.id,
          studentId: student.id,
          totalDue,
          totalPaid,
          balance: totalDue - totalPaid,
        },
      });
    }
    console.log(`  Created ${studentsCount} students`);

    // Calendar
    const calendar = await prisma.calendar.create({
      data: {
        schoolId: school.id,
        name: "Academic Calendar",
        isDefault: true,
      },
    });

    await prisma.calendarEvent.createMany({
      data: [
        {
          calendarId: calendar.id,
          title: "First Day of Term 1",
          eventType: "holiday",
          startDate: new Date(`${currentYear}-09-01`),
          endDate: new Date(`${currentYear}-09-01`),
          isAllDay: true,
        },
        {
          calendarId: calendar.id,
          title: "Independence Day",
          eventType: "holiday",
          startDate: new Date(`${currentYear + 1}-04-27`),
          endDate: new Date(`${currentYear + 1}-04-27`),
          isAllDay: true,
        },
        {
          calendarId: calendar.id,
          title: "Eid al-Fitr",
          eventType: "holiday",
          startDate: new Date(`${currentYear + 1}-03-30`),
          endDate: new Date(`${currentYear + 1}-03-31`),
          isAllDay: true,
        },
        {
          calendarId: calendar.id,
          title: "Eid al-Adha",
          eventType: "holiday",
          startDate: new Date(`${currentYear + 1}-06-06`),
          endDate: new Date(`${currentYear + 1}-06-07`),
          isAllDay: true,
        },
        {
          calendarId: calendar.id,
          title: "Christmas Day",
          eventType: "holiday",
          startDate: new Date(`${currentYear + 1}-12-25`),
          endDate: new Date(`${currentYear + 1}-12-25`),
          isAllDay: true,
        },
        {
          calendarId: calendar.id,
          title: "New Year Day",
          eventType: "holiday",
          startDate: new Date(`${currentYear + 1}-01-01`),
          endDate: new Date(`${currentYear + 1}-01-01`),
          isAllDay: true,
        },
      ],
    });

    console.log("  Created calendar events");
  }

  console.log("\n\n========================================");
  console.log("Seed completed successfully!");
  console.log("========================================\n");

  for (const schoolData of schools) {
    console.log(`\n${schoolData.name} (${schoolData.subdomain}):`);
    console.log(`  Admin: ${schoolData.email} / admin123`);
    console.log(`  URL: http://localhost:3000/login?school=${schoolData.subdomain}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
