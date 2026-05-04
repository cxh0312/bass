import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Header() {
  const handleLogout = () => {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  return (
    <header className="h-14 border-b bg-card px-4 flex items-center justify-between">
      <div className="text-sm text-muted-foreground">管理后台</div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-1" />
          登出
        </Button>
      </div>
    </header>
  )
}