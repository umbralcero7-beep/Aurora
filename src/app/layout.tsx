import './globals.css';
import { Roboto } from 'next/font/google';
import { ClientLayout } from "@/components/layout/client-layout";

const roboto = Roboto({
  weight: ['100', '300', '400', '500', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
});

export const metadata = {
  title: 'Aurora OS - Gestión de Alto Rendimiento',
  description: 'Sistema operativo estratégico para gastronomía de élite.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={roboto.variable} suppressHydrationWarning>
      <body className="font-body antialiased bg-background text-foreground">
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}