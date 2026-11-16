import { CustomizationPanel } from "@/components/dashboard/customization/customization-panel"
import { PageHeader } from "@/components/dashboard/page-header"
import { requireUser } from "@/lib/auth/session"

export const metadata = {
  title: "Customization | ScalePods",
}

export default async function CustomizationPage() {
  await requireUser()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customization"
        description="Fine-tune the assistant for website, Instagram and email — then push the change straight to your automation."
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.03] px-2.5 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-border">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Webhook connected
          </span>
        }
      />
      <CustomizationPanel />
    </div>
  )
}
