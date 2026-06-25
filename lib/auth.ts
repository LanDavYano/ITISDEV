import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { connectDB } = require('@/database/db')
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const User = require('@/database/User')

          await connectDB()

          const user = await User
            .findOne({ email: credentials.email.toLowerCase() })
            .select('+password')
            .populate('role', 'role_title')
            .populate('department', 'department_name')

          if (!user) return null

          const isValid: boolean = await user.comparePassword(credentials.password)
          if (!isValid) return null

          return {
            id:         user._id.toString(),
            email:      user.email,
            name:       `${user.firstName} ${user.lastName}`,
            firstName:  user.firstName,
            lastName:   user.lastName,
            role:       user.role?.role_title  ?? 'Member',
            department: user.department?.department_name ?? '',
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
        token.firstName  = user.firstName
        token.lastName   = user.lastName
        token.role       = user.role
        token.department = user.department
      }
      return token
    },
    async session({ session, token }) {
      session.user.id         = token.id
      session.user.firstName  = token.firstName
      session.user.lastName   = token.lastName
      session.user.role       = token.role
      session.user.department = token.department
      return session
    },
  },

  pages: {
    signIn: '/login',
  },

  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
}
