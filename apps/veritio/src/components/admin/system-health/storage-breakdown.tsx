'use client'

import { Database, HardDrive, File } from 'lucide-react'

interface StorageBreakdownProps {
  storage: {
    total_size_bytes: number
    recordings_size_bytes: number
    yjs_documents_size_bytes: number
    chunk_etags_size_bytes: number
    largest_tables: Array<{
      table_name: string
      size_bytes: number
    }>
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

export function StorageBreakdown({ storage }: StorageBreakdownProps) {
  const totalSize = storage.total_size_bytes
  const recordingsPercent = ((storage.recordings_size_bytes / totalSize) * 100).toFixed(1)
  const yjsPercent = ((storage.yjs_documents_size_bytes / totalSize) * 100).toFixed(1)
  const metadataPercent = ((storage.chunk_etags_size_bytes / totalSize) * 100).toFixed(1)

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold">Storage Overview</h2>

      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Total Database Size</span>
            </div>
            <div className="text-3xl font-bold text-foreground">
              {formatBytes(totalSize)}
            </div>
          </div>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-700"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-muted-foreground">Recordings</span>
            </div>
            <span className="text-xs font-semibold text-purple-600">{recordingsPercent}%</span>
          </div>
          <div className="text-2xl font-bold text-foreground mb-2">
            {formatBytes(storage.recordings_size_bytes)}
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 transition-all duration-700"
              style={{ width: `${recordingsPercent}%` }}
            />
          </div>
        </div>

        <div className="bg-card border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <File className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-muted-foreground">Yjs Documents</span>
            </div>
            <span className="text-xs font-semibold text-blue-600">{yjsPercent}%</span>
          </div>
          <div className="text-2xl font-bold text-foreground mb-2">
            {formatBytes(storage.yjs_documents_size_bytes)}
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-700"
              style={{ width: `${yjsPercent}%` }}
            />
          </div>
        </div>

        <div className="bg-card border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-muted-foreground">Chunk Metadata</span>
            </div>
            <span className="text-xs font-semibold text-amber-600">{metadataPercent}%</span>
          </div>
          <div className="text-2xl font-bold text-foreground mb-2">
            {formatBytes(storage.chunk_etags_size_bytes)}
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-600 transition-all duration-700"
              style={{ width: `${metadataPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-4">Largest Tables</h3>
        <div className="space-y-3">
          {storage.largest_tables.slice(0, 10).map((table, index) => {
            const percent = ((table.size_bytes / totalSize) * 100).toFixed(1)
            return (
              <div key={table.table_name} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground min-w-[20px]">
                      #{index + 1}
                    </span>
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {table.table_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">{percent}%</span>
                    <span className="text-sm font-semibold text-foreground min-w-[80px] text-right">
                      {formatBytes(table.size_bytes)}
                    </span>
                  </div>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-700"
                    style={{
                      width: `${percent}%`,
                      transitionDelay: `${index * 50}ms`,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
