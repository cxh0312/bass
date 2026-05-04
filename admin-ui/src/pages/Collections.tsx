import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { getProjectCollections, getCollectionData, type Collection, type CollectionData } from '@/lib/api'

export function Collections() {
  const navigate = useNavigate()
  const params = useParams()
  const projectId = params.projectId
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [data, setData] = useState<CollectionData[]>([])
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)

  useEffect(() => {
    if (projectId) {
      loadProjectCollections(projectId)
    } else {
      loadCollections()
    }
  }, [projectId])

  const loadProjectCollections = async (pid: string) => {
    setLoading(true)
    try {
      const res = await getProjectCollections(pid)
      if (res.code === 0) {
        setCollections(res.data)
      }
    } catch (err) {
      console.error('Failed to load collections:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadCollections = async () => {
    setLoading(true)
    try {
      const res = await getProjectCollections('')
      if (res.code === 0) {
        setCollections(res.data)
      }
    } catch (err) {
      console.error('Failed to load collections:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadCollectionData = async (collection: Collection) => {
    setSelectedCollection(collection)
    setDataLoading(true)
    try {
      const res = await getCollectionData(collection.id)
      if (res.code === 0) {
        setData(res.data)
      }
    } catch (err) {
      console.error('Failed to load collection data:', err)
    } finally {
      setDataLoading(false)
    }
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* 左侧：集合列表 */}
      <div className="w-64 border rounded-lg p-4 overflow-auto">
        <h2 className="text-lg font-bold mb-4">集合列表</h2>
        {loading ? (
          <p>加载中...</p>
        ) : (
          <ul className="space-y-1">
            {collections.map(col => (
              <li key={col.id}>
                <button
                  onClick={() => loadCollectionData(col)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedCollection?.id === col.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                >
                  <div className="font-medium">{col.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {col.strict ? '严格模式' : '灵活模式'}
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/collections/${col.id}`)
                  }}
                  className="w-full text-left px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  查看详情 →
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 右侧：数据表格 */}
      <div className="flex-1 border rounded-lg p-4 overflow-auto">
        {selectedCollection ? (
          <>
            <h2 className="text-lg font-bold mb-4">{selectedCollection.name} - 数据</h2>
            {dataLoading ? (
              <p>加载数据...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Payload</TableHead>
                    <TableHead>创建时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        暂无数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.id}</TableCell>
                        <TableCell className="font-mono text-xs max-w-md truncate">
                          {JSON.stringify(item.payload)}
                        </TableCell>
                        <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            选择左侧集合查看数据
          </div>
        )}
      </div>
    </div>
  )
}