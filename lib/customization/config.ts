/**
 * Channels that can be customised from the dashboard. The values are the
 * identifiers sent to the automation webhook, so they must stay stable.
 */
export const CUSTOMIZATION_CHANNELS = ["website", "instagram", "gmail"] as const

export type CustomizationChannel = (typeof CUSTOMIZATION_CHANNELS)[number]

export interface ChannelDefinition {
  id: CustomizationChannel
  label: string
  shortLabel: string
  description: string
  placeholder: string
  accent: string
}

export const CHANNEL_DEFINITIONS: ChannelDefinition[] = [
  {
    id: "website",
    label: "Website",
    shortLabel: "Website",
    description: "The assistant that greets visitors on your website widget.",
    placeholder:
      "Example: You are the ScalePods website assistant. Answer questions about pricing, book a demo when the visitor is ready, and keep replies under 80 words.",
    accent: "blue",
  },
  {
    id: "instagram",
    label: "Instagram",
    shortLabel: "Instagram",
    description: "Replies sent from Instagram direct messages.",
    placeholder:
      "Example: Reply to Instagram DMs in a friendly, casual tone. Mention our latest offer and always ask for the best email to follow up.",
    accent: "pink",
  },
  {
    id: "gmail",
    label: "Email",
    shortLabel: "Gmail",
    description: "Email replies handled through the connected Gmail inbox.",
    placeholder:
      "Example: Write clear, professional email replies. Summarise the customer's request, answer it, and end with a short call to action.",
    accent: "red",
  },
]

export function isCustomizationChannel(
  value: unknown
): value is CustomizationChannel {
  return (
    typeof value === "string" &&
    (CUSTOMIZATION_CHANNELS as readonly string[]).includes(value)
  )
}

export function channelLabel(channel: CustomizationChannel): string {
  return (
    CHANNEL_DEFINITIONS.find((definition) => definition.id === channel)?.label ??
    channel
  )
}
