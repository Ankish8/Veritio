import { Header } from "@/components/dashboard/header"
import { getAllStudies } from "@/lib/data/studies"
import { StudiesClient } from "./studies-client"

// Force dynamic rendering to ensure cookies are available for auth
export const dynamic = 'force-dynamic'

export default async function StudiesPage() {
  const studies = await getAllStudies()
  return (
    <>
      <Header title="Studies" />
      <StudiesClient initialData={{ data: studies, total: studies.length }} />
    </>
  )
}
