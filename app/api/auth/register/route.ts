import { NextRequest, NextResponse } from "next/server"
import { connectDB, User, Role } from "@/database"

const AIESEC_EMAIL_RE = /^[^\s@]+@aiesec\.ph$/i

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, password, confirm, userType } =
      await req.json()

    // --- validation ---
    if (!firstName || !lastName || !email || !password || !confirm) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 })
    }
    if (!AIESEC_EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "Email must be a valid @aiesec.ph address." },
        { status: 400 }
      )
    }
    if (password !== confirm) {
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 }
      )
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      )
    }

    const resolvedType: "admin" | "member" =
      userType === "admin" ? "admin" : "member"

    await connectDB()

    // --- duplicate email check ---
    const existing = await User.findOne({ email: email.toLowerCase().trim() })
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      )
    }

    // --- resolve Role document (create if missing on fresh DB) ---
    const roleLevel = resolvedType === "admin" ? 3 : 1
    const roleTitle =
      resolvedType === "admin" ? "Leader of Department" : "Member"
    let role = await Role.findOne({ level: roleLevel })
    if (!role) {
      role = await Role.create({ level: roleLevel, title: roleTitle })
    }

    // --- create user (password hashed by Mongoose pre-save hook) ---
    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password,
      userType: resolvedType,
      role: role._id,
    })

    const res = NextResponse.json(
      {
        message: "Account created successfully.",
        userType: resolvedType,
        userId: user._id,
      },
      { status: 201 }
    )

    // Set a simple auth cookie so subsequent requests know who is logged in
    const sessionPayload = encodeURIComponent(JSON.stringify({
      userId: String(user._id),
      userType: resolvedType,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
    }))
    res.cookies.set("auth_session", sessionPayload, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
    })

    return res
  } catch (err: any) {
    console.error("[register]", err)
    if (err.code === 11000) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    )
  }
}
