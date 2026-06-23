# Data layer — MongoDB (Mongoose)

Backend models for the AIESEC Performance Management System. This replaces the
old MySQL schema (`aisec_dlsu.sql`, kept only as historical reference) with
MongoDB collections via Mongoose.

## Files

| File                    | Purpose                                                        |
| ----------------------- | -------------------------------------------------------------- |
| `db.js`                 | Cached MongoDB connection (`connectDB` / `disconnectDB`).      |
| `Role.js`               | 3 fixed roles (`level` 1–3, `title`).                          |
| `Department.js`         | Departments + `officeType`, optional `deptLeader` → User.      |
| `SubDepartment.js`      | Sub-departments under a Department, optional `subDeptLeader`.  |
| `User.js`               | Members; bcrypt-hashed password, refs Role/Dept/SubDept.       |
| `PerformanceRecord.js`  | One submission per user per month/year period.                 |
| `index.js`              | Barrel export of the connection helpers + all models.          |
| `seed.js`               | Wipes & re-seeds reference data, demo users, a sample record.  |

## Setup

1. Copy the env template and point it at your database:

   ```bash
   cp .env.example .env.local
   # then edit MONGODB_URI (local default: mongodb://127.0.0.1:27017/aiesec_dlsu)
   ```

2. Make sure MongoDB is running locally (or use a MongoDB Atlas URI).

3. Seed the database:

   ```bash
   npm run seed        # or: node model/seed.js
   ```

   Demo accounts created (password for all: `Password123!`):

   | Email                      | Role                          |
   | -------------------------- | ----------------------------- |
   | alexa.pleyto@aiesec.ph     | Leader of Department (admin)  |
   | marco.reyes@aiesec.ph      | Team Leader of Sub Department |
   | bea.santos@aiesec.ph       | Member                        |

## Usage (e.g. a Next.js route handler)

```js
const { connectDB, User } = require("../../model")

export async function GET() {
  await connectDB()
  const users = await User.find().populate("role department subDepartment")
  return Response.json(users)
}
```

## Schema mapping (SQL → MongoDB)

- Integer auto-increment PKs → Mongo `ObjectId`.
- Foreign keys → `ObjectId` refs (`ref` + `.populate()`).
- Circular leader FKs (`dept_leader_id`, `sub_dept_leader_id`) → nullable
  `deptLeader` / `subDeptLeader` refs to User.
- `ENUM` columns → schema `enum` validators.
- `UNIQUE` constraints → unique indexes (incl. the compound
  `user + periodYear + periodMonth` and `department + name`).
- `CHECK` constraints → schema `min`/`max` + `pre('validate')` guards.
- `created_at` / `updated_at` → Mongoose `{ timestamps: true }`.
