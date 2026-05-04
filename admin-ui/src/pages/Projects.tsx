import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Webhook, Key, Database, Trophy, Users as UsersIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { getProjects, createProject, updateProject, deleteProject, type Project } from '@/lib/api'

export function Projects() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '' })

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const res = await getProjects()
      if (res.code === 0) {
        setProjects(res.data)
      }
    } catch (err) {
      console.error('Failed to load projects:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingProject(null)
    setFormData({ name: '', description: '' })
    setDialogOpen(true)
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setFormData({ name: project.name, description: project.description || '' })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('删除此项目？')) return
    try {
      const res = await deleteProject(id)
      if (res.code === 0) {
        setProjects(projects.filter(p => p.id !== id))
      }
    } catch (err) {
      alert('删除失败')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingProject) {
        const res = await updateProject(editingProject.id, formData)
        if (res.code === 0) {
          setProjects(projects.map(p => p.id === editingProject.id ? res.data : p))
          setDialogOpen(false)
        }
      } else {
        const res = await createProject(formData)
        if (res.code === 0) {
          setProjects([res.data, ...projects])
          setDialogOpen(false)
        }
      }
    } catch (err) {
      alert('操作失败')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">项目管理</h1>
        <Button onClick={handleCreate}><Plus className="w-4 h-4 mr-1" /> 创建项目</Button>
      </div>

      {loading ? (
        <p>加载中...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>描述</TableHead>
              <TableHead>API Key</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map(project => (
              <TableRow key={project.id}>
                <TableCell className="font-medium">{project.name}</TableCell>
                <TableCell>{project.description || '-'}</TableCell>
                <TableCell className="font-mono text-xs">{project.apiKey}</TableCell>
                <TableCell>{new Date(project.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/projects/${project.id}/api-keys`)} title="API Keys">
                      <Key className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/projects/${project.id}/webhooks`)} title="Webhooks">
                      <Webhook className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/projects/${project.id}/collections`)} title="Collections">
                      <Database className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/projects/${project.id}/leaderboards`)} title="Leaderboards">
                      <Trophy className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/projects/${project.id}/members`)} title="成员管理">
                      <UsersIcon className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(project)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(project.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProject ? '编辑项目' : '创建项目'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label>名称</Label>
                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div>
                <Label>描述</Label>
                <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button type="submit">{editingProject ? '更新' : '创建'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}