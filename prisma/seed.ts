import { PrismaClient, UserRole, MarkingPeriodType, EnrollmentStatus, SchoolType, GradeDivision } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Sierra Leone Schools - mix of school types
const schools = [
  {
    name: "Freetown Municipal Primary School",
    shortName: "FMPS",
    subdomain: "freetown-municipal",
    schoolType: SchoolType.PRIMARY as const,
    address: "Siaka Stevens Street",
    city: "Freetown",
    state: "Western Area",
    country: "SL",
    phone: "+232-76-123456",
    email: "admin@fmps.edu.sl",
    website: "https://fmps.edu.sl",
    timezone: "Africa/Freetown",
  },
  {
    name: "Bo Government Junior Secondary School",
    shortName: "BGJSS",
    subdomain: "bo-jss",
    schoolType: SchoolType.JUNIOR_SECONDARY as const,
    address: "Boom Road",
    city: "Bo",
    state: "Southern Province",
    country: "SL",
    phone: "+232-77-234567",
    email: "admin@bgjss.edu.sl",
    website: "https://bgjss.edu.sl",
    timezone: "Africa/Freetown",
  },
  {
    name: "Sierra Leone Grammar School",
    shortName: "SLGS",
    subdomain: "grammar-school",
    schoolType: SchoolType.SENIOR_SECONDARY as const,
    address: "17 Sanders Street",
    city: "Freetown",
    state: "Western Area",
    country: "SL",
    phone: "+232-78-345678",
    email: "admin@slgs.edu.sl",
    website: "https://slgs.edu.sl",
    timezone: "Africa/Freetown",
  },
  {
    name: "Holy Trinity Secondary School",
    shortName: "HTSS",
    subdomain: "holy-trinity-kenema",
    schoolType: SchoolType.SENIOR_SECONDARY as const,
    address: "27 Hangha Road",
    city: "Kenema",
    state: "Eastern Province",
    country: "SL",
    phone: "+232-79-456789",
    email: "admin@htss.edu.sl",
    website: "https://htss.edu.sl",
    timezone: "Africa/Freetown",
  },
  {
    name: "Ahmadiyya Muslim Secondary School",
    shortName: "AMSS",
    subdomain: "ahmadiyya-muslim",
    schoolType: SchoolType.SENIOR_SECONDARY as const,
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

// Sierra Leonean names
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
  { first: "Emmanuel", last: "Thomas" },
  { first: "Samuel", last: "Johnson" },
  { first: "Joseph", last: "Smith" },
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
  { first: "Grace", last: "Thomas" },
  { first: "Mercy", last: "Johnson" },
  { first: "Patricia", last: "Smith" },
];

const cities = ["Freetown", "Bo", "Kenema", "Makeni", "Koidu"];

// Sierra Leone 6-3-3-4 Education System
// Primary: Grades 1-6 (6 years)
// JSS: Grades 7-9 (3 years) - Junior Secondary
// SSS: Grades 10-12 (3 years) - Senior Secondary

function getGradeLevelsForSchoolType(schoolType: SchoolType) {
  switch (schoolType) {
    case SchoolType.PRIMARY:
      return [
        { name: "Grade 1", code: "P1", division: GradeDivision.PRIMARY, sortOrder: 0 },
        { name: "Grade 2", code: "P2", division: GradeDivision.PRIMARY, sortOrder: 1 },
        { name: "Grade 3", code: "P3", division: GradeDivision.PRIMARY, sortOrder: 2 },
        { name: "Grade 4", code: "P4", division: GradeDivision.PRIMARY, sortOrder: 3 },
        { name: "Grade 5", code: "P5", division: GradeDivision.PRIMARY, sortOrder: 4 },
        { name: "Grade 6", code: "P6", division: GradeDivision.PRIMARY, sortOrder: 5 },
      ];
    case SchoolType.JUNIOR_SECONDARY:
      return [
        { name: "Grade 7", code: "JSS1", division: GradeDivision.JSS, sortOrder: 0 },
        { name: "Grade 8", code: "JSS2", division: GradeDivision.JSS, sortOrder: 1 },
        { name: "Grade 9", code: "JSS3", division: GradeDivision.JSS, sortOrder: 2 },
      ];
    case SchoolType.SENIOR_SECONDARY:
      return [
        { name: "Grade 10", code: "SSS1", division: GradeDivision.SSS, sortOrder: 0 },
        { name: "Grade 11", code: "SSS2", division: GradeDivision.SSS, sortOrder: 1 },
        { name: "Grade 12", code: "SSS3", division: GradeDivision.SSS, sortOrder: 2 },
      ];
    case SchoolType.COMBINED:
    default:
      return [
        { name: "Grade 1", code: "P1", division: GradeDivision.PRIMARY, sortOrder: 0 },
        { name: "Grade 2", code: "P2", division: GradeDivision.PRIMARY, sortOrder: 1 },
        { name: "Grade 3", code: "P3", division: GradeDivision.PRIMARY, sortOrder: 2 },
        { name: "Grade 4", code: "P4", division: GradeDivision.PRIMARY, sortOrder: 3 },
        { name: "Grade 5", code: "P5", division: GradeDivision.PRIMARY, sortOrder: 4 },
        { name: "Grade 6", code: "P6", division: GradeDivision.PRIMARY, sortOrder: 5 },
        { name: "Grade 7", code: "JSS1", division: GradeDivision.JSS, sortOrder: 6 },
        { name: "Grade 8", code: "JSS2", division: GradeDivision.JSS, sortOrder: 7 },
        { name: "Grade 9", code: "JSS3", division: GradeDivision.JSS, sortOrder: 8 },
        { name: "Grade 10", code: "SSS1", division: GradeDivision.SSS, sortOrder: 9 },
        { name: "Grade 11", code: "SSS2", division: GradeDivision.SSS, sortOrder: 10 },
        { name: "Grade 12", code: "SSS3", division: GradeDivision.SSS, sortOrder: 11 },
      ];
  }
}

function getSubjectsForSchoolType(schoolType: SchoolType) {
  // Core subjects for all levels
  const core = [
    { name: "Mathematics", code: "MATH" },
    { name: "English Language", code: "ENG" },
  ];

  switch (schoolType) {
    case SchoolType.PRIMARY:
      return [
        ...core,
        { name: "Environmental Science", code: "ENV" },
        { name: "Creative Arts", code: "ARTS" },
        { name: "Physical Education", code: "PE" },
        { name: "Religious Studies", code: "REL" },
        { name: "Social Studies", code: "SOC" },
        { name: "Krio Language", code: "KRIO" },
      ];
    case SchoolType.JUNIOR_SECONDARY:
      return [
        ...core,
        { name: "Biology", code: "BIO" },
        { name: "Physics", code: "PHY" },
        { name: "Chemistry", code: "CHEM" },
        { name: "Geography", code: "GEO" },
        { name: "History", code: "HIST" },
        { name: "Agricultural Science", code: "AGRI" },
        { name: "Computer Studies", code: "COMP" },
        { name: "Home Economics", code: "HOME" },
      ];
    case SchoolType.SENIOR_SECONDARY:
      return [
        ...core,
        { name: "Biology", code: "BIO" },
        { name: "Physics", code: "PHY" },
        { name: "Chemistry", code: "CHEM" },
        { name: "Geography", code: "GEO" },
        { name: "History", code: "HIST" },
        { name: "Agricultural Science", code: "AGRI" },
        { name: "Economics", code: "ECON" },
        { name: "Government", code: "GOV" },
      ];
    default:
      return [
        ...core,
        { name: "Biology", code: "BIO" },
        { name: "Physics", code: "PHY" },
        { name: "Chemistry", code: "CHEM" },
      ];
  }
}

async function main() {
  console.log("Seeding LeoneSIS database (Sierra Leone 6-3-3-4 System)...\n");

  const adminPassword = await bcrypt.hash("admin123", 12);
  const teacherPassword = await bcrypt.hash("teacher123", 12);
  const currentYear = new Date().getFullYear();

  for (const schoolData of schools) {
    console.log(`\n--- Creating ${schoolData.name} (${schoolData.schoolType}) ---`);

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
    console.log(`  Admin: ${adminUsername} / admin123`);

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

    // Grade levels based on school type (6-3-3-4)
    const gradeLevelData = getGradeLevelsForSchoolType(schoolData.schoolType);
    const gradeLevels: any[] = [];

    for (let i = 0; i < gradeLevelData.length; i++) {
      const gl = gradeLevelData[i];
      const created = await prisma.gradeLevel.create({
        data: {
          schoolId: school.id,
          name: gl.name,
          code: gl.code,
          division: gl.division,
          sortOrder: gl.sortOrder,
          nextGradeLevelId: undefined, // will set after all created
        },
      });
      gradeLevels.push(created);
    }

    // Link grade levels in chain
    for (let i = 0; i < gradeLevels.length - 1; i++) {
      await prisma.gradeLevel.update({
        where: { id: gradeLevels[i].id },
        data: { nextGradeLevelId: gradeLevels[i + 1].id },
      });
    }
    console.log(`  Created ${gradeLevels.length} grade levels (${gradeLevelData[0].division})`);

    // Marking periods (3 terms - Sierra Leone standard)
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
    console.log("  Created 3 marking periods");

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
        name: schoolData.schoolType === "PRIMARY" ? "Sierra Leone Primary Curriculum" : "WAEC Standard Curriculum",
        description: schoolData.schoolType === "PRIMARY"
          ? "Sierra Leone National Primary School Curriculum"
          : "West African Examinations Council standard curriculum",
      },
    });

    // Subjects
    const subjectData = getSubjectsForSchoolType(schoolData.schoolType);
    const subjectRecords = await Promise.all(
      subjectData.map((data) =>
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

    // Courses - create courses for each subject
    const courses: any[] = [];
    for (const subj of subjectRecords) {
      const course = await prisma.course.create({
        data: {
          schoolId: school.id,
          subjectId: subj.id,
          name: subj.name,
          code: subj.code,
          description: `${subj.name} course`,
          creditHours: 1,
        },
      });
      courses.push(course);
    }
    console.log(`  Created ${courses.length} courses`);

    // Course sections - one per grade level for core subjects
    const sectionCount = Math.min(gradeLevels.length, courses.length);
    const sections: any[] = [];
    for (let i = 0; i < sectionCount; i++) {
      const section = await prisma.courseSection.create({
        data: {
          courseId: courses[i % courses.length].id,
          schoolId: school.id,
          name: `${courses[i % courses.length].name} - ${gradeLevels[i].name}A`,
          academicYear: `${currentYear}-${currentYear + 1}`,
          markingPeriodId: term1.id,
          roomId: rooms[i % rooms.length].id,
          primaryTeacherId: staffMembers[i % staffMembers.length].id,
          maxCapacity: 45,
        },
      });
      sections.push(section);
    }
    console.log(`  Created ${sections.length} course sections`);

    // Attendance codes
    await prisma.attendanceCode.createMany({
      data: [
        { schoolId: school.id, code: "P", name: "Present", isDefault: true, isPresent: true, sortOrder: 0 },
        { schoolId: school.id, code: "A", name: "Absent", isPresent: false, countsAsAbsent: true, sortOrder: 1 },
        { schoolId: school.id, code: "T", name: "Tardy", isPresent: true, countsAsTardy: true, sortOrder: 2 },
        { schoolId: school.id, code: "E", name: "Excused Absence", isPresent: false, countsAsAbsent: true, sortOrder: 3 },
        { schoolId: school.id, code: "H", name: "Half Day", isPresent: true, sortOrder: 4 },
        { schoolId: school.id, code: "L", name: "Late", isPresent: true, countsAsTardy: true, sortOrder: 5 },
        { schoolId: school.id, code: "OE", name: "Out of School Excused", isPresent: false, countsAsAbsent: true, sortOrder: 6 },
      ],
    });
    console.log("  Created attendance codes");

    // Grade scale (WAEC for secondary, percentage for primary)
    const gradeScale = await prisma.gradeScale.create({
      data: {
        schoolId: school.id,
        name: schoolData.schoolType === "PRIMARY" ? "Primary Grading" : "WAEC Grading",
        isDefault: true,
      },
    });

    if (schoolData.schoolType === "PRIMARY") {
      await prisma.gradeScaleGrade.createMany({
        data: [
          { gradeScaleId: gradeScale.id, letter: "A", percentageMin: 80, percentageMax: 100, numericValue: 4, isPassing: true, sortOrder: 0 },
          { gradeScaleId: gradeScale.id, letter: "B", percentageMin: 70, percentageMax: 79.99, numericValue: 3, isPassing: true, sortOrder: 1 },
          { gradeScaleId: gradeScale.id, letter: "C", percentageMin: 60, percentageMax: 69.99, numericValue: 2, isPassing: true, sortOrder: 2 },
          { gradeScaleId: gradeScale.id, letter: "D", percentageMin: 50, percentageMax: 59.99, numericValue: 1, isPassing: true, sortOrder: 3 },
          { gradeScaleId: gradeScale.id, letter: "E", percentageMin: 40, percentageMax: 49.99, numericValue: 0.5, isPassing: false, sortOrder: 4 },
          { gradeScaleId: gradeScale.id, letter: "F", percentageMin: 0, percentageMax: 39.99, numericValue: 0, isPassing: false, sortOrder: 5 },
        ],
      });
    } else {
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
    }
    console.log("  Created grade scale");

    // Assignment types
    await prisma.assignmentType.createMany({
      data: [
        { schoolId: school.id, name: "Homework", weight: 15, sortOrder: 0 },
        { schoolId: school.id, name: "Quiz", weight: 15, sortOrder: 1 },
        { schoolId: school.id, name: "Mid-Term Exam", weight: 30, sortOrder: 2 },
        { schoolId: school.id, name: "Project/Practical", weight: 10, sortOrder: 3 },
        { schoolId: school.id, name: "Final Exam", weight: 30, sortOrder: 4 },
      ],
    });

    // Students - distribute across grade levels
    const studentsCount = 25;
    for (let i = 0; i < studentsCount; i++) {
      const isMale = i % 2 === 0;
      const namePool = isMale ? maleNames : femaleNames;
      const name = namePool[i % namePool.length];

      const gradeIndex = i % gradeLevels.length;
      const gradeLevel = gradeLevels[gradeIndex];

      // Age appropriate for grade level
      const gradeNum = parseInt(gradeLevel.name.replace("Grade ", ""));
      const birthYear = currentYear - gradeNum - 6;
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
          eventType: "academic",
          startDate: new Date(`${currentYear}-09-01`),
          endDate: new Date(`${currentYear}-09-01`),
          isAllDay: true,
        },
        {
          calendarId: calendar.id,
          title: "National Independence Day",
          eventType: "holiday",
          startDate: new Date(`${currentYear + 1}-04-27`),
          endDate: new Date(`${currentYear + 1}-04-27`),
          isAllDay: true,
        },
        {
          calendarId: calendar.id,
          title: "Christmas Day",
          eventType: "holiday",
          startDate: new Date(`${currentYear}-12-25`),
          endDate: new Date(`${currentYear}-12-25`),
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
          title: "End of Term 1",
          eventType: "academic",
          startDate: new Date(`${currentYear}-12-15`),
          endDate: new Date(`${currentYear}-12-15`),
          isAllDay: true,
        },
      ],
    });
    console.log("  Created calendar events");
  }

  console.log("\n\n========================================");
  console.log("Seed completed successfully!");
  console.log("Sierra Leone 6-3-3-4 Education System");
  console.log("========================================\n");

  for (const schoolData of schools) {
    console.log(`${schoolData.name} (${schoolData.schoolType}):`);
    console.log(`  Admin: ${schoolData.shortName.toLowerCase()}admin / admin123`);
    console.log(`  URL: http://localhost:3000`);
    console.log("");
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
