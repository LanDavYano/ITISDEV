/**
 * Database seed for the AIESEC Performance Management System (MongoDB).
 *
 * Mirrors the reference + organizational structure from aisec_dlsu.sql and adds
 * a few demo users plus a sample performance record so the system is usable
 * out of the box.
 *
 * Run with:  node model/seed.js   (or: npm run seed)
 *
 * WARNING: this wipes the role, department, subdepartment, user and
 * performancerecord collections before re-inserting.
 */

const { connectDB, disconnectDB } = require("./db")
const Role = require("./Role")
const Department = require("./Department")
const SubDepartment = require("./SubDepartment")
const User = require("./User")
const PerformanceRecord = require("./PerformanceRecord")
const EvaluationCycle = require("./EvaluationCycle")
const AuditLog = require("./AuditLog")
const Announcement = require("./Announcement")
const AnnouncementLog = require("./AnnouncementLog")

const MONTHS = PerformanceRecord.MONTHS

// --- Reference data ---------------------------------------------------------

const ROLES = [
  { level: 1, title: "Member" },
  { level: 2, title: "Team Leader of Sub Department" },
  { level: 3, title: "Leader of Department" }, // admin-level access
]

const DEPARTMENTS = [
  { name: "Incoming Global Talent", officeType: "Front Office" },
  { name: "Incoming Global Volunteer", officeType: "Front Office" },
  { name: "Outgoing Exchange", officeType: "Front Office" },
  { name: "Business Development", officeType: "Back Office" },
  { name: "Finance and Legal Administrations", officeType: "Back Office" },
  { name: "Marketing", officeType: "Back Office" },
  { name: "Talent Management", officeType: "Back Office" },
]

// department name → sub-department names
const SUB_DEPARTMENTS = {
  "Incoming Global Talent": [
    "Product Management",
    "International Relations",
    "Customer Experience",
  ],
  "Incoming Global Volunteer": [
    "Product Management",
    "Customer Experience",
    "International Relations",
    "Accounts Management",
  ],
  "Outgoing Exchange": [
    "External Growth Strategies",
    "Exchange Management",
    "International Relations",
  ],
  "Business Development": [
    "Stakeholder Development",
    "Business Intelligence",
    "Product Sales",
  ],
  "Finance and Legal Administrations": [
    "University Compliance",
    "Finance and Legalities",
    "Strategic Finance",
  ],
  Marketing: [
    "Brand Marketing",
    "Incoming Exchange Marketing",
    "Outgoing Exchange Marketing",
  ],
  "Talent Management": [
    "Performance Management",
    "Learning and Development",
    "Member and Alumni Experience",
  ],
}

async function seed() {
  await connectDB()

  console.log("[seed] Clearing existing collections…")
  await Promise.all([
    AuditLog.deleteMany({}),
    AnnouncementLog.deleteMany({}),
    Announcement.deleteMany({}),
    PerformanceRecord.deleteMany({}),
    EvaluationCycle.deleteMany({}),
    User.deleteMany({}),
    SubDepartment.deleteMany({}),
    Department.deleteMany({}),
    Role.deleteMany({}),
  ])

  // 1. Roles
  console.log("[seed] Inserting roles…")
  const roles = await Role.insertMany(ROLES)
  const roleByLevel = Object.fromEntries(roles.map((r) => [r.level, r]))

  // 2. Departments
  console.log("[seed] Inserting departments…")
  const departments = await Department.insertMany(DEPARTMENTS)
  const deptByName = Object.fromEntries(departments.map((d) => [d.name, d]))

  // 3. Sub-departments
  console.log("[seed] Inserting sub-departments…")
  const subDocs = []
  for (const [deptName, subs] of Object.entries(SUB_DEPARTMENTS)) {
    const dept = deptByName[deptName]
    for (const name of subs) {
      subDocs.push({ name, department: dept._id })
    }
  }
  const subDepartments = await SubDepartment.insertMany(subDocs)
  const subByKey = Object.fromEntries(
    subDepartments.map((s) => [`${s.department}:${s.name}`, s])
  )

  // 4. Demo users (passwords are hashed by the User pre-save hook).
  //    Default password for every demo account: "Password123!"
  console.log("[seed] Creating demo users…")
  const tm = deptByName["Talent Management"]
  const perfMgmt = subByKey[`${tm._id}:Performance Management`]

  // Leader of Department (admin-level)
  const deptLeader = await User.create({
    firstName: "Alexander",
    lastName: "DGreat",
    email: "alexander.dgreat@aiesec.ph",
    password: "Password123!",
    birthdate: new Date("2003-05-12"),
    idNumber: "12000001",
    role: roleByLevel[3]._id,
    department: tm._id,
    subDepartment: perfMgmt._id,
  })

  // Team Leader of Sub Department
  const teamLeader = await User.create({
    firstName: "Marco",
    lastName: "Reyes",
    email: "marco.reyes@aiesec.ph",
    password: "Password123!",
    birthdate: new Date("2003-09-30"),
    idNumber: "12000002",
    role: roleByLevel[2]._id,
    department: tm._id,
    subDepartment: perfMgmt._id,
  })

  // Member
  const member = await User.create({
    firstName: "Bea",
    lastName: "Santos",
    email: "bea.santos@aiesec.ph",
    password: "Password123!",
    birthdate: new Date("2004-02-18"),
    idNumber: "12000003",
    role: roleByLevel[1]._id,
    department: tm._id,
    subDepartment: perfMgmt._id,
  })

  // 5. Wire up the circular leader references (dept_leader / sub_dept_leader).
  console.log("[seed] Assigning leaders…")
  tm.deptLeader = deptLeader._id
  await tm.save()
  perfMgmt.subDeptLeader = teamLeader._id
  await perfMgmt.save()

  // 6. Current evaluation cycle (open, deadline = end of the current month).
  console.log("[seed] Creating the current evaluation cycle…")
  const now = new Date()
  const periodMonth = MONTHS[now.getMonth()]
  const periodYear = now.getFullYear()
  const endOfMonth = new Date(periodYear, now.getMonth() + 1, 0, 23, 59, 59)
  const cycle = await EvaluationCycle.create({
    periodMonth,
    periodYear,
    submissionDeadline: endOfMonth,
    createdBy: deptLeader._id,
  })

  // 6b. Sample system announcement (active, no expiry) + its creation log.
  console.log("[seed] Creating a sample announcement…")
  const announcement = await Announcement.create({
    title: `Welcome to the ${periodMonth} ${periodYear} evaluation cycle!`,
    content:
      `Submissions for the ${periodMonth} cycle are now open. ` +
      `Please complete your goals and self-ratings before ${endOfMonth.toDateString()}. ` +
      `Reach out to the PM team if you have any questions.`,
    postedAt: new Date(),
    expiresAt: endOfMonth,
    createdBy: deptLeader._id,
    createdByName: `${deptLeader.firstName} ${deptLeader.lastName}`,
  })
  await AnnouncementLog.create({
    announcement: announcement._id,
    titleSnapshot: announcement.title,
    action: "create",
    actor: deptLeader._id,
    actorName: `${deptLeader.firstName} ${deptLeader.lastName}`,
    actorRole: "Leader of Department",
  })

  // 7. Sample performance record for the member (current cycle, submitted,
  //    with team-leader-assigned deliverable/meeting counts).
  console.log("[seed] Creating a sample performance record…")
  await PerformanceRecord.create({
    user: member._id,
    periodMonth,
    periodYear,
    personalGoal: "Improve my time management and finish tasks ahead of deadlines.",
    professionalGoal: "Onboard two new members and lead one EP consultation call.",
    personalRating: 85,
    professionalRating: 88,
    submittedAt: new Date(),
    // Team-leader-assigned counts:
    deliverablesAssigned: 10,
    deliverablesAnswered: 8,
    meetingsTotal: 4,
    meetingsAttended: 4,
  })

  console.log("\n[seed] Done ✅")
  console.log(`  roles:            ${roles.length}`)
  console.log(`  departments:      ${departments.length}`)
  console.log(`  sub-departments:  ${subDepartments.length}`)
  console.log(`  users:            3 (demo password: Password123!)`)
  console.log(`  cycle:            ${cycle.periodMonth} ${cycle.periodYear} (deadline ${endOfMonth.toDateString()})`)
  console.log(`  announcements:    1 (active until ${endOfMonth.toDateString()})`)
  console.log(`  performance recs: 1`)
}

seed()
  .then(() => disconnectDB())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("[seed] Failed:", err)
    await disconnectDB()
    process.exit(1)
  })
