/**
 * User model.
 *
 * SQL origin: `user` table.
 * - References Role, Department, and (optionally) SubDepartment.
 * - Passwords are hashed with bcrypt before saving and are never returned by
 *   default (`select: false`). Use `.select('+password')` when you need to
 *   compare during login.
 * - email/idNumber are unique, mirroring uq_user_email / uq_user_id_number.
 */

const { mongoose } = require("./db")
const bcrypt = require("bcryptjs")

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 100 },
    lastName: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
      match: [EMAIL_REGEX, "Please provide a valid email address"],
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false, // never return the hash by default
    },
    birthdate: { type: Date, required: false },
    idNumber: {
      type: String,
      required: false,
      trim: true,
      maxlength: 20,
      index: { unique: true, sparse: true }, // sparse allows multiple nulls
    },
    userType: {
      type: String,
      enum: ["admin", "member"],
      required: true,
      default: "member",
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: false,
      default: null,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: false,
      default: null,
    },
    subDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubDepartment",
      default: null,
    },
    profilePicture: {
      type: String,
      default: '/images/default-avatar.png',
    },
  },
  { timestamps: true } // created_at / updated_at
)

// Hash the password whenever it is set or changed.
// (Mongoose 9 async middleware resolves on return / rejects on throw.)
userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

// Convenience method for login checks.
userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password)
}

// Virtual full name helper.
userSchema.virtual("fullName").get(function getFullName() {
  return `${this.firstName} ${this.lastName}`
})

module.exports = mongoose.models.User || mongoose.model("User", userSchema)
