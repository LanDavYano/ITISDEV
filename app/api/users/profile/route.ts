import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/users/profile
 * Retrieve the current user's full profile from the database
 */
export async function GET(request: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - no session' },
        { status: 401 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, User } = require('@/database')
    await connectDB()

    // Fetch user with all related data
    const user = await User.findById(session.user.id)
      .populate('role', 'title level')
      .populate('department', 'name')
      .populate('subDepartment', 'name')
      .lean()

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      birthdate: user.birthdate,
      idNumber: user.idNumber,
      userType: user.userType,
      role: user.role?.title ?? '',
      roleId: user.role?._id.toString() ?? '',
      roleLevel: user.role?.level ?? null,
      department: user.department?.name ?? '',
      departmentId: user.department?._id.toString() ?? '',
      subDepartment: user.subDepartment?.name ?? '',
      subDepartmentId: user.subDepartment?._id.toString() ?? '',
      profilePicture: user.profilePicture || '/images/default-avatar.png',
    })
  } catch (error) {
    console.error('[GET /api/users/profile] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/users/profile
 * Update the current user's profile
 * Cannot update: email (for now as per requirement)
 */
export async function PUT(request: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - no session' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { firstName, lastName, birthdate, idNumber, profilePicture } = body

    // Validate required fields
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'firstName and lastName are required' },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, User } = require('@/database')
    await connectDB()

    // Update only allowed fields
    const user = await User.findByIdAndUpdate(
      session.user.id,
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(birthdate && { birthdate }),
        ...(idNumber && { idNumber: idNumber.trim() }),
        ...(profilePicture && { profilePicture }),
      },
      { new: true, runValidators: true }
    )
      .populate('role', 'title level')
      .populate('department', 'name')
      .populate('subDepartment', 'name')

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      birthdate: user.birthdate,
      idNumber: user.idNumber,
      userType: user.userType,
      role: user.role?.title ?? '',
      roleId: user.role?._id.toString() ?? '',
      roleLevel: user.role?.level ?? null,
      department: user.department?.name ?? '',
      departmentId: user.department?._id.toString() ?? '',
      subDepartment: user.subDepartment?.name ?? '',
      subDepartmentId: user.subDepartment?._id.toString() ?? '',
      profilePicture: user.profilePicture || '/images/default-avatar.png',
    })
  } catch (error) {
    console.error('[PUT /api/users/profile] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
