import type { NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { supabaseAdmin } from './supabase';

export const authOptions: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        if (!supabaseAdmin) {
          throw new Error('Database not configured');
        }

        // Find user by email
        const { data: user, error } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('email', credentials.email)
          .single();

        if (error || !user) {
          throw new Error('Invalid credentials');
        }

        // Check if user has a password
        if (!user.password_hash) {
          throw new Error('Password login is not available for this account');
        }

        // Verify password
        const isValid = await compare(
          credentials.password as string,
          user.password_hash as string
        );

        if (!isValid) {
          throw new Error('Invalid credentials');
        }

        // Update last login
        await supabaseAdmin
          .from('users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.full_name,
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
