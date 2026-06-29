import WebAppTestDemo from '@/components/home/WebAppTestDemo'
import PrototypeTestDemo from '@/components/home/PrototypeTestDemo'
import SurveyDemo from '@/components/home/SurveyDemo'
import CardSortDemo from '@/components/home/CardSortDemo'
import TreeTestDemo from '@/components/home/TreeTestDemo'
import FirstClickDemo from '@/components/home/FirstClickDemo'
import FirstImpressionDemo from '@/components/home/FirstImpressionDemo'

export default function TabContent({ id }: { id: string }) {
  switch (id) {
    case 'card-sort':
      return <CardSortDemo />
    case 'tree-test':
      return <TreeTestDemo />
    case 'survey':
      return <SurveyDemo />
    case 'first-click':
      return <FirstClickDemo />
    case 'web-app':
      return <WebAppTestDemo />
    case 'website-prototype':
      return <PrototypeTestDemo />
    case 'first-impression':
      return <FirstImpressionDemo />
    default:
      return null
  }
}
