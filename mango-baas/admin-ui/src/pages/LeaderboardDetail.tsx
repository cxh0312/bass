import { useState, useEffect } from 'react'
import { ArrowLeft, Trash2, Crown } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { getLeaderboard, getLeaderboardEntries, deleteLeaderboardEntry, type Leaderboard, type LeaderboardEntry } from '@/lib/api'

export function LeaderboardDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ projectId: string; id: string }>()
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null)
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [lbRes, entriesRes] = await Promise.all([
        getLeaderboard(id),
        getLeaderboardEntries(id),
      ])

      if (lbRes.code === 0) {
        setLeaderboard(lbRes.data)
      } else {
        setError(lbRes.msg)
      }

      if (entriesRes.code === 0) {
        setEntries(entriesRes.data)
      }
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Delete this entry?')) return
    try {
      const res = await deleteLeaderboardEntry(id!, entryId)
      if (res.code === 0) {
        setEntries(entries.filter(e => e.id !== entryId))
      }
    } catch (err) {
      alert('Delete failed')
    }
  }

  const getRank = (index: number): number => {
    if (!leaderboard) return index + 1
    return leaderboard.metric === 'higher' ? index + 1 : entries.length - index
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b px-6 py-4">
          <p>Loading...</p>
        </header>
      </div>
    )
  }

  if (error || !leaderboard) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b px-6 py-4">
          <p className="text-red-600">{error || 'Leaderboard not found'}</p>
        </header>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{leaderboard.name}</h1>
            {leaderboard.description && (
              <p className="text-sm text-muted-foreground">{leaderboard.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <span className={`px-3 py-1 rounded text-sm ${leaderboard.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
            {leaderboard.enabled ? 'Active' : 'Disabled'}
          </span>
          <span className={`px-3 py-1 rounded text-sm ${leaderboard.metric === 'higher' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
            {leaderboard.metric === 'higher' ? 'Higher is better' : 'Lower is better'}
          </span>
        </div>
      </header>

      <main className="p-6">
        {/* Top N Preview */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            Top 10
          </h2>
          {entries.length === 0 ? (
            <p className="text-muted-foreground">No entries yet</p>
          ) : (
            <div className="grid grid-cols-10 gap-2 mb-4">
              {entries.slice(0, 10).map((entry, index) => (
                <div
                  key={entry.id}
                  className={`p-3 rounded-lg border text-center ${
                    index === 0 ? 'bg-yellow-100 border-yellow-400' :
                    index === 1 ? 'bg-gray-100 border-gray-300' :
                    index === 2 ? 'bg-orange-100 border-orange-300' :
                    'bg-card border-border'
                  }`}
                >
                  <div className="text-xs text-muted-foreground mb-1">#{index + 1}</div>
                  <div className="font-bold truncate">{entry.oderId.slice(0, 8)}</div>
                  <div className="text-lg font-bold">{entry.score}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* All Entries */}
        <section>
          <h2 className="text-lg font-semibold mb-4">All Entries ({entries.length})</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Player ID</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Metadata</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, index) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-bold">
                    #{getRank(index)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{entry.oderId}</TableCell>
                  <TableCell className="font-bold">{entry.score}</TableCell>
                  <TableCell>
                    {entry.metadata ? (
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {JSON.stringify(entry.metadata).slice(0, 30)}...
                      </code>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{new Date(entry.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteEntry(entry.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </main>
    </div>
  )
}
