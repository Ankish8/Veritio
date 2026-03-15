declare module 'heatmap.js' {
  export interface HeatmapConfiguration {
    container: HTMLElement
    radius?: number
    maxOpacity?: number
    minOpacity?: number
    blur?: number
    gradient?: Record<string, string>
    backgroundColor?: string
  }

  export interface DataPoint {
    x: number
    y: number
    value: number
  }

  export interface HeatmapData {
    max: number
    min?: number
    data: DataPoint[]
  }

  export interface Heatmap {
    setData(data: HeatmapData): void
    addData(data: DataPoint | DataPoint[]): void
    repaint(): void
    getDataURL(): string
    getData(): HeatmapData
  }

  const h337: {
    create(config: HeatmapConfiguration): Heatmap
  }

  export default h337
}
