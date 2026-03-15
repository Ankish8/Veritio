"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Link2, Gift, Settings } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const panelSections = [
  {
    title: "Participants",
    description: "Manage your participant panel and segments",
    icon: Users,
    href: "/panel/participants",
    color: "text-blue-500",
  },
  {
    title: "Widget",
    description: "Configure and manage your recruitment widget",
    icon: Settings,
    href: "/panel/widget",
    color: "text-purple-500",
  },
  {
    title: "Links & Sharing",
    description: "Manage study links, UTM parameters, and QR codes",
    icon: Link2,
    href: "/panel/links",
    color: "text-green-500",
  },
  {
    title: "Incentives",
    description: "Track and manage participant incentives",
    icon: Gift,
    href: "/panel/incentives",
    color: "text-orange-500",
  },
]

export function PanelClient() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Panel Management</h2>
        <p className="text-muted-foreground">
          Everything you need to find, manage, and incentivize research participants
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {panelSections.map((section) => (
          <Card key={section.href} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${section.color}`}>
                  <section.icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {section.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Link href={section.href}>
                <Button variant="outline" className="w-full">
                  Go to {section.title}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
