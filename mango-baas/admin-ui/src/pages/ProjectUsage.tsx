import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { getProjects, getProjectUsage, type Project, type ProjectUsage } from '@/lib/api'

export function ProjectUsage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [usage, setUsage] = useState<ProjectUsage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (projectId || (projects.length > 0 && !selectedProject)) {
      const id = projectId || projects[0].id
      const project = projects.find(p => p.id === id)
      if (project) {
        setSelectedProject(project)
        loadUsage(project.id)
      }
    }
  }, [projectId, projects])

  async function loadProjects() {
    try {
      const res = await getProjects()
      if (res.code === 0) setProjects(res.data)
    } catch (err) {
      setError('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  async function loadUsage(id: string) {
    try {
      setLoading(true)
      const res = await getProjectUsage(id)
      if (res.code === 0) setUsage(res.data)
    } catch (err) {
      setError('Failed to load usage data')
    } finally {
      setLoading(false)
    }
  }

  const dailyEntries = usage
    ? Object.entries(usage.dailyCounts).sort(([a], [b]) => a.localeCompare(b))
    : []

  const maxDaily = Math.max(...dailyEntries.map(([, c]) => c), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {projectId && (
          <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <h1 className="text-2xl font-bold">Project Usage</h1>
      </div>

      {projects.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {projects.map(p => (
            <Button
              key={p.id}
              variant={selectedProject?.id === p.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setSelectedProject(p); loadUsage(p.id) }}
            >
              {p.name}
            </Button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : error ? (
        <p className="text-destructive">{error}</p>
      ) : usage ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Calls (30d)</p>
              <p className="text-2xl font-semibold mt-1">{usage.totalCalls.toLocaleString()}</p>
            </div>
            <div className="bg-card rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Errors (30d)</p>
              <p className="text-2xl font-semibold mt-1 text-destructive">{usage.errorCount.toLocaleString()}</p>
            </div>
            <div className="bg-card rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Error Rate</p>
              <p className={`text-2xl font-semibold mt-1 ${usage.errorRate > 5 ? 'text-destructive' : ''}`}>
                {usage.errorRate}%
              </p>
            </div>
          </div>

          {/* Daily Trend */}
          <div className="bg-card rounded-lg border p-4">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Daily API Calls
            </h2>
            <div className="flex items-end gap-1 h-32">
              {dailyEntries.map(([date, count]) => (
                <div key={date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary rounded-t transition-all"
                    style={{ height: `${Math.max((count / maxDaily) * 100, 2)}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground truncate max-w-[30px]">
                    {new Date(date).getDate()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Endpoints */}
          <div className="bg-card rounded-lg border p-4">
            <h2 className="font-semibold mb-4">Top Endpoints</h2>
            {usage.topEndpoints.length === 0 ? (
              <p className="text-muted-foreground text-sm">No data yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usage.topEndpoints.map((ep, i) => (
                    <TableRow key={ep.endpoint}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{ep.endpoint}</TableCell>
                      <TableCell className="text-right">{ep.count.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </>
      ) : (
        <p className="text-muted-foreground">Select a project to view usage</p>
      )}
    </div>
  )
}
