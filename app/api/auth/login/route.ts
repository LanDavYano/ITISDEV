import { NextRequest, NextResponse } from "next/server"
import { connectDB, User } from "@/database"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      )
    }

    await connectDB()

    // password field is `select: false` by default — explicitly select it
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      "+password"
    )

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      )
    }

    const match = await user.comparePassword(password)
    if (!match) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      )
    }

    // Determine role for redirect — prefer stored userType, fall back to
    // checking the populated role level for seeded users
    let userType: "admin" | "member" = user.userType ?? "member"
    if (!user.userType && user.role) {
      const populated = await user.populate("role")
      if ((populated.role as any)?.level >= 2) userType = "admin"
    }

    const res = NextResponse.json({
      message: "Login successful.",
      userType,
      userId: String(user._id),
    })

    const sessionPayload = encodeURIComponent(JSON.stringify({
      userId: String(user._id),
      userType,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
    }))
    res.cookies.set("auth_session", sessionPayload, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    })

    return res
  } catch (err) {
    console.error("[login]", err)
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    )
  }
}
