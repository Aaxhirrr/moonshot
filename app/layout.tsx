import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono, IBM_Plex_Sans, Fraunces } from 'next/font/google'
import { Courier_Prime } from 'next/font/google'

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT"],
})
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
const _courierPrime = Courier_Prime({ weight: ["400", "700"], subsets: ["latin"] });
const _ibmPlexSans = IBM_Plex_Sans({ weight: ["300", "400", "500", "600"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'moonshot — Nova-powered context optimization',
  description: 'moonshot analyzes large codebases, removes irrelevant context, and sends Nova only the files and snippets needed for the task.',
  keywords: ['Amazon Nova', 'context optimization', 'LLM', 'code analysis', 'token reduction', 'AI developer tools'],
  authors: [{ name: 'moonshot' }],
  openGraph: {
    title: 'moonshot — Nova-powered context optimization',
    description: 'Cut wasted AI context before Nova ever sees it. Large repos in. Smaller, cleaner prompts out.',
    type: 'website',
    url: 'https://moonshot.dev',
    siteName: 'moonshot',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'moonshot — Nova-powered context optimization',
    description: 'Cut wasted AI context before Nova ever sees it.',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased ${fraunces.variable}`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
