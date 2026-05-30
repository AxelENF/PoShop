import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: 'SNAPGAD POS — Punto de Venta Inteligente',
  description: 'La gobernanza y gestión operativa proactiva para tu comercio físico.',
};

import { TRPCProvider } from '../utils/trpc/Provider';
import { UserSessionProvider } from '../lib/user-session';
import { ShiftProvider } from '../lib/shift-context';
import { ThemeProvider } from '../components/theme-context';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={jakarta.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  document.documentElement.setAttribute('data-theme', 'light');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased" style={{ margin: 0, backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
        <TRPCProvider>
          <UserSessionProvider>
            <ShiftProvider>
              <ThemeProvider>
                {children}
              </ThemeProvider>
            </ShiftProvider>
          </UserSessionProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}


