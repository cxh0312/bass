import { Link, useLocation } from 'react-router-dom'
import { Users, FolderKanban, Database, LayoutDashboard, ScrollText, Gauge, Clock, Bell } from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: '概览' },
  { to: '/users', icon: Users, label: '用户' },
  { to: '/projects', icon: FolderKanban, label: '项目' },
  { to: '/collections', icon: Database, label: '集合' },
  { to: '/audit-logs', icon: ScrollText, label: '审计日志' },
  { to: '/rate-limits', icon: Gauge, label: '速率限制' },
  { to: '/slow-queries', icon: Clock, label: '慢查询' },
  { to: '/alerts', icon: Bell, label: '告警规则' },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className="w-64 min-h-screen bg-card border-r flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5" />
          Mango BaaS
        </h1>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = location.pathname === item.to
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}