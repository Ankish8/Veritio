import {
  Mail,
  User,
  Users,
  Calendar,
  MapPin,
  Heart,
  Home,
  Briefcase,
  Building2,
  TrendingUp,
  Award,
  LayoutGrid,
  Smartphone,
  Monitor,
  Globe,
  Zap,
  GraduationCap,
  MapPinned,
  Clock3,
  History,
  Phone,
  Clock,
  MessageSquare,
  Target,
  BarChart3,
  UserCheck,
  Languages,
  Settings,
  Smile
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DemographicFieldType } from '@veritio/prototype-test/lib/supabase/study-flow-types'
export const fieldLabels: Record<DemographicFieldType, string> = {
  email: 'Email',
  firstName: 'First Name',
  lastName: 'Last Name',
  gender: 'Gender',
  ageRange: 'Age Range',
  location: 'Location',
  maritalStatus: 'Marital Status',
  householdSize: 'Household Size',
  employmentStatus: 'Employment Status',
  jobTitle: 'Job Title',
  industry: 'Industry',
  companySize: 'Company Size',
  yearsOfExperience: 'Years of Experience',
  department: 'Department',
  // Technology & Usage Context
  primaryDevice: 'Primary Device',
  operatingSystem: 'Operating System',
  browserPreference: 'Primary Browser',
  techProficiency: 'Tech Proficiency Level',
  // Education & Background
  educationLevel: 'Education Level',
  occupationType: 'Current Occupation',
  locationType: 'Area Type',
  timeZone: 'Time Zone',
  // Research Participation
  priorExperience: 'Research Experience',
  followUpWillingness: 'Follow-up Interviews',
  researchAvailability: 'Availability',
  contactConsent: 'Contact Preference',
  yearsUsingProduct: 'Years Using Product',
  productUsageFrequency: 'Usage Frequency',
  // Accessibility & Inclusivity
  accessibilityNeeds: 'Accessibility Needs',
  preferredLanguage: 'Preferred Language',
  assistiveTechnology: 'Assistive Technology',
  digitalComfort: 'Digital Comfort Level',
}
export const fieldIcons: Record<DemographicFieldType, LucideIcon> = {
  email: Mail,
  firstName: User,
  lastName: User,
  gender: Users,
  ageRange: Calendar,
  location: MapPin,
  maritalStatus: Heart,
  householdSize: Home,
  employmentStatus: Briefcase,
  jobTitle: Award,
  industry: Building2,
  companySize: Building2,
  yearsOfExperience: TrendingUp,
  department: LayoutGrid,
  // Technology & Usage Context
  primaryDevice: Smartphone,
  operatingSystem: Monitor,
  browserPreference: Globe,
  techProficiency: Zap,
  // Education & Background
  educationLevel: GraduationCap,
  occupationType: Briefcase,
  locationType: MapPinned,
  timeZone: Clock3,
  // Research Participation
  priorExperience: History,
  followUpWillingness: Phone,
  researchAvailability: Clock,
  contactConsent: MessageSquare,
  yearsUsingProduct: Target,
  productUsageFrequency: BarChart3,
  // Accessibility & Inclusivity
  accessibilityNeeds: UserCheck,
  preferredLanguage: Languages,
  assistiveTechnology: Settings,
  digitalComfort: Smile,
}
export const BASIC_FIELD_TYPES: DemographicFieldType[] = ['gender', 'ageRange', 'location', 'maritalStatus', 'householdSize']
export const PROFESSIONAL_FIELD_TYPES: DemographicFieldType[] = ['employmentStatus', 'jobTitle', 'industry', 'companySize', 'yearsOfExperience', 'department']
export const TECHNOLOGY_FIELD_TYPES: DemographicFieldType[] = ['primaryDevice', 'operatingSystem', 'browserPreference', 'techProficiency']
export const EDUCATION_FIELD_TYPES: DemographicFieldType[] = ['educationLevel', 'occupationType', 'locationType', 'timeZone']
export const RESEARCH_FIELD_TYPES: DemographicFieldType[] = ['priorExperience', 'followUpWillingness', 'researchAvailability', 'contactConsent', 'yearsUsingProduct', 'productUsageFrequency']
export const ACCESSIBILITY_FIELD_TYPES: DemographicFieldType[] = ['accessibilityNeeds', 'preferredLanguage', 'assistiveTechnology', 'digitalComfort']
export const fieldPlaceholders: Record<DemographicFieldType, string> = {
  // Text input fields (example values)
  email: 'you@example.com',
  firstName: 'John',
  lastName: 'Smith',
  jobTitle: 'Product Manager',
  // Basic Demographics (dropdowns - short hints)
  gender: 'Choose...',
  ageRange: 'Choose...',
  location: 'Choose...',
  maritalStatus: 'Choose...',
  householdSize: 'Choose...',
  // Professional / Work Details
  employmentStatus: 'Choose...',
  industry: 'Choose...',
  companySize: 'Choose...',
  yearsOfExperience: 'Choose...',
  department: 'Choose...',
  // Technology & Usage Context
  primaryDevice: 'Choose...',
  operatingSystem: 'Choose...',
  browserPreference: 'Choose...',
  techProficiency: 'Choose...',
  // Education & Background
  educationLevel: 'Choose...',
  occupationType: 'Choose...',
  locationType: 'Choose...',
  timeZone: 'Choose...',
  // Research Participation
  priorExperience: 'Choose...',
  followUpWillingness: 'Choose...',
  researchAvailability: 'Choose...',
  contactConsent: 'Choose...',
  yearsUsingProduct: 'Choose...',
  productUsageFrequency: 'Choose...',
  // Accessibility & Inclusivity
  accessibilityNeeds: 'Choose...',
  preferredLanguage: 'Choose...',
  assistiveTechnology: 'Choose...',
  digitalComfort: 'Choose...',
}
