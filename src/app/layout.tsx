import '@/styles/globals.css';
import type { Metadata } from 'next';
import { Public_Sans } from 'next/font/google';

const publicSans = Public_Sans({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-public-sans'
});

export const metadata: Metadata = {
  title: 'PPA LDO LOA - Gestão Orçamentária',
  description: 'Sistema de Planejamento e Orçamento Público',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={publicSans.variable}>
      <body className="font-display">
        {children}
      </body>
    </html>
  );
}
