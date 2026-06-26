import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

// Re-exported for convenience; defined in lib/roles.ts (client-safe).
export { roleHomePath } from './roles'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // --- Validate Login Inputs -------------------------------------
        if (!credentials?.email || !credentials?.password) return null

        const email = credentials.email.trim().toLowerCase()
        if (!EMAIL_REGEX.test(email)) return null
        if (credentials.password.length < 1) return null

        try {
          // --- Integrate Login with User Database ----------------------
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { connectDB, User } = require('@/database')

          await connectDB()

          const user = await User.findOne({ email })
            .select('+password')
            .populate('role', 'title level')
            .populate('department', 'name')
            .populate('subDepartment', 'name')

          // --- Handle Incorrect Login Attempts -------------------------
          // Return null for both "no such user" and "wrong password" so we
          // never reveal which one failed. NextAuth turns this into the
          // generic CredentialsSignin error shown on the login page.
          if (!user) return null

          const isValid: boolean = await user.comparePassword(
            credentials.password
          )
          if (!isValid) return null

          // Shape returned here is persisted into the JWT (see callbacks).
          return {
            id:         user._id.toString(),
            email:      user.email,
            name:       `${user.firstName} ${user.lastName}`,
            firstName:  user.firstName,
            lastName:   user.lastName,
            role:       user.role?.title ?? 'Member',
            roleLevel:  user.role?.level ?? 1,
            department: user.department?.name ?? '',
            subDepartment: user.subDepartment?.name ?? '',
          }
        } catch (err) {
          console.error('[auth] authorize error:', err)
          return null
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id         = user.id
        token.firstName  = (user as any).firstName
        token.lastName   = (user as any).lastName
        token.role       = (user as any).role
        token.roleLevel  = (user as any).roleLevel
        token.department = (user as any).department
        token.subDepartment = (user as any).subDepartment
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id         = token.id as string
        session.user.firstName  = token.firstName as string
        session.user.lastName   = token.lastName as string
        session.user.role       = token.role as string
        session.user.roleLevel  = token.roleLevel as number
        session.user.department = token.department as string
        session.user.subDepartment = token.subDepartment as string
      }
      return session
    },
  },

  pages: {
    signIn: '/login',
  },

  // --- Session Management and Persistence ----------------------------
  // JWT strategy stores the session in a signed, httpOnly cookie so it
  // persists across reloads without a server-side session store.
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}
