/**
 * Type declarations for heatmap.js library
 * @see https://www.patrick-wied.at/static/heatmapjs/
 */

declare module 'heatmap.js' {
  export interface HeatmapConfiguration {
    container: HTMLElement
    radius?: number
    maxOpacity?: number
    minOpacity?: number
    blur?: number
    gradient?: Record<number, string>
    xField?: string
    yField?: string
    valueField?: string
  }

  export interface HeatmapDataPoint {
    x: number
    y: number
    value: number
  }

  export interface HeatmapData {
    max: number
    min?: number
    data: HeatmapDataPoint[]
  }

  export interface Heatmap {
    setData(data: HeatmapData): void
    addData(point: HeatmapDataPoint | HeatmapDataPoint[]): void
    getData(): HeatmapData
    getValueAt(point: { x: number; y: number }): number
    repaint(): void
    getDataURL(): string
    configure(config: Partial<HeatmapConfiguration>): void
  }

  export interface HeatmapFactory {
    create(config: HeatmapConfiguration): Heatmap
  }

  const h337: HeatmapFactory
  export default h337
}
