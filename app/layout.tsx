import type { Metadata } from 'next';
import './globals.css';
import SessionProvider from '@/components/providers/SessionProvider';
import ThemeProvider from '@/components/providers/ThemeProvider';
import Sidebar from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: 'AgenticRev - AI Visibility & Search Platform',
  description: 'Track AI visibility across ChatGPT, Perplexity, Gemini, and more',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <SessionProvider>
            <div className="flex h-screen">
              <Sidebar />
              <div className="flex-1 overflow-auto">
                {children}
              </div>
            </div>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
