/**
 * Model barrel — single entry point for the data layer.
 *
 * Usage (e.g. in a Next.js route handler):
 *   const { connectDB, User, Role } = require("../../model")
 *   await connectDB()
 *   const users = await User.find().populate("role department")
 */

const { connectDB, disconnectDB, mongoose, MONGODB_URI } = require("./db")

const Role = require("./Role")
const Department = require("./Department")
const SubDepartment = require("./SubDepartment")
const User = require("./User")
const PerformanceRecord = require("./PerformanceRecord")
const PasswordResetToken = require("./PasswordResetToken")
const EvaluationCycle   = require("./EvaluationCycle")

module.exports = {
  connectDB,
  disconnectDB,
  mongoose,
  MONGODB_URI,
  Role,
  Department,
  SubDepartment,
  User,
  PerformanceRecord,
  PasswordResetToken,
  EvaluationCycle,
}
