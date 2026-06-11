import { Plus_Jakarta_Sans } from 'next/font/google'
import './finnly-dashboard.css'

const pjs = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-pjs',
  weight: ['400', '500', '600', '700', '800'],
})

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <div className={pjs.variable}>{children}</div>
}
