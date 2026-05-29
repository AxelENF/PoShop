import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SNAPGAD Admin — Panel de Control Interno',
  description: 'Gobernanza centralizada de licencias, revendedores y tenants para SNAPGAD.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#09090b', color: '#f4f4f5' }}>
        {children}
      </body>
    </html>
  );
}
