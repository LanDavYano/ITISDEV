import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface User {
    id: string
    firstName: string
    lastName: string
    role: string
    roleLevel: number
    department: string
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      firstName: string
      lastName: string
      role: string
      roleLevel: number
      department: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    firstName: string
    lastName: string
    role: string
    roleLevel: number
    department: string
  }
}
