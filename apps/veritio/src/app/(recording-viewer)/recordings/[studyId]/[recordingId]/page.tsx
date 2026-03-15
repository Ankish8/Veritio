import { RecordingPageClient } from './recording-page-client'

interface RecordingPageProps {
  params: Promise<{
    studyId: string
    recordingId: string
  }>
}

export default async function RecordingPage({ params }: RecordingPageProps) {
  const { studyId, recordingId } = await params

  return (
    <RecordingPageClient
      studyId={studyId}
      recordingId={recordingId}
    />
  )
}
