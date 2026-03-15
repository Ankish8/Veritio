import { Header } from "@/components/dashboard/header"
import { PanelClient } from "./panel-client"

export default async function PanelPage() {
  return (
    <>
      <Header title="Panel" />
      <PanelClient />
    </>
  )
}
