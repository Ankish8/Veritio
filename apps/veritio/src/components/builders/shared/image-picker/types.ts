export interface ImageData {
  image_url: string
  original_filename?: string | null
  width?: number | null
  height?: number | null
  source_type: 'upload' | 'figma'
  figma_file_key?: string | null
  figma_node_id?: string | null
}

export interface ImagePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studyId: string
  /**
   * ID of the task or design - used to filter out current image from library
   */
  entityId: string
  /**
   * Currently selected image (if any)
   */
  currentImage: ImageData | null
  /**
   * Callback when an image is selected
   */
  onImageSelected: (image: ImageData) => void
  /**
   * Function to get existing images from other entities in this study
   * This allows the component to be reused across First Click and First Impression
   */
  getExistingImages: () => ImageData[]
  /**
   * Function to upload an image to storage
   * Returns the public URL and metadata
   */
  uploadImage: (file: File) => Promise<{
    url: string
    filename: string
    width: number
    height: number
  }>
}
