// ─── Types ────────────────────────────────────────────────────────────────────

export type Channel = "website" | "whatsapp" | "instagram" | "gmail"

export type MessageRole = "user" | "ai" | "agent" | "system"

export type SessionStatus = "active" | "resolved" | "pending"

export interface User {
  id: string
  name: string
  email?: string
  phone?: string
  avatar: string
}

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: string
  senderName?: string
  deliveryStatus?: "sent" | "delivered" | "read"
}

export interface Conversation {
  id: string
  user: User
  channel: Channel
  lastMessage: string
  lastActivity: string
  unread: boolean
  status: SessionStatus
  sessionId: string
  firstContacted: string
  assignedAgent?: string
  summary?: ConversationSummary
  messages: Message[]
}

export interface ConversationSummary {
  text: string
  intent: string
  requirements: string[]
  meetingStatus: "none" | "requested" | "booked"
  handoffStatus: "none" | "requested" | "completed"
}

export interface CallbackRequest {
  id: string
  customer: string
  phone: string
  requestTime: string
  reason: string
  status: "pending" | "attended" | "not_attended"
}

export interface Meeting {
  id: string
  customer: string
  contactInfo: string
  dateTime: string
  reason: string
  status: "scheduled" | "completed" | "cancelled" | "no_show"
}

// ─── Mock Conversations ───────────────────────────────────────────────────────

export const mockConversations: Conversation[] = [
  {
    id: "1",
    user: { id: "u1", name: "Sarah Johnson", email: "sarah.j@company.com", avatar: "SJ" },
    channel: "website",
    lastMessage: "I'm interested in your AI automation services.",
    lastActivity: "2 min ago",
    unread: true,
    status: "active",
    sessionId: "sess_9f8a3b2c",
    firstContacted: "Oct 28, 2026",
    assignedAgent: undefined,
    summary: {
      text: "Sarah is evaluating AI automation tools for her company's customer support workflow. She's shown strong interest in the chatbot and automation capabilities.",
      intent: "Product evaluation & purchase intent",
      requirements: ["Chatbot integration", "CRM sync", "Custom workflows"],
      meetingStatus: "requested",
      handoffStatus: "none",
    },
    messages: [
      {
        id: "m1",
        role: "system",
        content: "Conversation started",
        timestamp: "Oct 28, 2026 · 10:12 AM",
      },
      {
        id: "m2",
        role: "ai",
        content: "Hi there! 👋 Welcome to ScalePods. I'm here to help you explore how our AI solutions can transform your business. What can I help you with today?",
        timestamp: "10:12 AM",
        deliveryStatus: "read",
      },
      {
        id: "m3",
        role: "user",
        content: "Hi! I'm interested in your AI automation services.",
        timestamp: "10:13 AM",
        deliveryStatus: "read",
      },
      {
        id: "m4",
        role: "ai",
        content: "That's great to hear! ScalePods offers a full suite of AI automation tools — from intelligent chatbots to workflow automation and CRM integrations. Could you tell me a bit about your current setup and what challenges you're hoping to solve?",
        timestamp: "10:13 AM",
        deliveryStatus: "read",
      },
      {
        id: "m5",
        role: "user",
        content: "We're a mid-sized company currently using Zendesk for support. We get around 500 tickets a day and the team is overwhelmed. Looking for something that can automate first-level resolution.",
        timestamp: "10:15 AM",
        deliveryStatus: "read",
      },
      {
        id: "m6",
        role: "ai",
        content: "500 tickets per day is definitely a high volume — I understand why automation is a priority! Our AI chatbot can typically resolve 60–70% of first-level queries without human intervention. It integrates natively with Zendesk and can be trained on your existing knowledge base.\n\nWould you like me to arrange a demo with one of our solution engineers?",
        timestamp: "10:16 AM",
        deliveryStatus: "read",
      },
      {
        id: "m7",
        role: "user",
        content: "Yes, that sounds perfect. Can we schedule something this week?",
        timestamp: "10:17 AM",
        deliveryStatus: "read",
      },
      {
        id: "m8",
        role: "system",
        content: "Meeting booked · Thu, Oct 30 at 2:00 PM",
        timestamp: "10:17 AM",
      },
      {
        id: "m9",
        role: "ai",
        content: "I've booked a demo for Thursday, October 30th at 2:00 PM with our solutions team. You'll receive a calendar invite at sarah.j@company.com shortly. Is there anything specific you'd like us to cover in the demo?",
        timestamp: "10:18 AM",
        deliveryStatus: "read",
      },
      {
        id: "m10",
        role: "user",
        content: "I'm interested in your AI automation services.",
        timestamp: "10:43 AM",
        deliveryStatus: "delivered",
      },
    ],
  },
  {
    id: "2",
    user: { id: "u2", name: "Alex Morgan", email: "alex.m@startup.io", avatar: "AM" },
    channel: "whatsapp",
    lastMessage: "Can I schedule a meeting with your team?",
    lastActivity: "15 min ago",
    unread: false,
    status: "active",
    sessionId: "sess_7k2b4d1e",
    firstContacted: "Oct 27, 2026",
    assignedAgent: "Priya S.",
    summary: {
      text: "Alex is a startup founder interested in embedding the chatbot on their app. They had an initial question about pricing then requested a meeting.",
      intent: "Product inquiry — pricing & integration",
      requirements: ["App embedding", "API access", "Startup pricing"],
      meetingStatus: "booked",
      handoffStatus: "completed",
    },
    messages: [
      {
        id: "m1",
        role: "system",
        content: "Conversation started via WhatsApp",
        timestamp: "Oct 27, 2026 · 3:40 PM",
      },
      {
        id: "m2",
        role: "ai",
        content: "Hello Alex! Thanks for reaching out to ScalePods on WhatsApp. How can I help you today?",
        timestamp: "3:40 PM",
        deliveryStatus: "read",
      },
      {
        id: "m3",
        role: "user",
        content: "Hey, I wanted to know if you have startup pricing? We're early-stage and budget is tight.",
        timestamp: "3:42 PM",
        deliveryStatus: "read",
      },
      {
        id: "m4",
        role: "ai",
        content: "Absolutely! We have a Startup plan designed for early-stage companies. It includes up to 3 channels, 5,000 conversations/month, and core automation features — starting at $49/month.\n\nWould you like to speak with our team to explore if this fits your needs?",
        timestamp: "3:43 PM",
        deliveryStatus: "read",
      },
      {
        id: "m5",
        role: "user",
        content: "Can I schedule a meeting with your team?",
        timestamp: "3:58 PM",
        deliveryStatus: "read",
      },
      {
        id: "m6",
        role: "system",
        content: "Agent Priya S. joined the conversation",
        timestamp: "4:00 PM",
      },
      {
        id: "m7",
        role: "agent",
        content: "Hi Alex! I'm Priya from the ScalePods sales team. Happy to chat about startup pricing and get you set up with a demo. When works best for you this week?",
        timestamp: "4:01 PM",
        senderName: "Priya S.",
        deliveryStatus: "read",
      },
    ],
  },
  {
    id: "3",
    user: { id: "u3", name: "Adnan Shaikh", phone: "+1 (555) 0192", avatar: "AS" },
    channel: "instagram",
    lastMessage: "Could you share more information about pricing?",
    lastActivity: "1 hour ago",
    unread: false,
    status: "pending",
    sessionId: "sess_4m9c6h3f",
    firstContacted: "Oct 28, 2026",
    summary: {
      text: "Adnan reached out through Instagram DMs asking about pricing. No meeting booked yet.",
      intent: "Pricing inquiry",
      requirements: ["Pricing details", "Feature comparison"],
      meetingStatus: "none",
      handoffStatus: "none",
    },
    messages: [
      {
        id: "m1",
        role: "system",
        content: "Conversation started via Instagram",
        timestamp: "Oct 28, 2026 · 9:02 AM",
      },
      {
        id: "m2",
        role: "ai",
        content: "Hey! 👋 Thanks for reaching out to ScalePods on Instagram. What can I help you with today?",
        timestamp: "9:02 AM",
        deliveryStatus: "read",
      },
      {
        id: "m3",
        role: "user",
        content: "Could you share more information about pricing?",
        timestamp: "9:45 AM",
        deliveryStatus: "delivered",
      },
    ],
  },
  {
    id: "4",
    user: { id: "u4", name: "Anonymous User", avatar: "AU" },
    channel: "website",
    lastMessage: "I need help with my previous inquiry.",
    lastActivity: "3 hours ago",
    unread: false,
    status: "resolved",
    sessionId: "sess_1n3d8k2g",
    firstContacted: "Oct 28, 2026",
    messages: [
      {
        id: "m1",
        role: "system",
        content: "Conversation started",
        timestamp: "Oct 28, 2026 · 7:30 AM",
      },
      {
        id: "m2",
        role: "ai",
        content: "Welcome to ScalePods! How can I assist you today?",
        timestamp: "7:30 AM",
        deliveryStatus: "read",
      },
      {
        id: "m3",
        role: "user",
        content: "I need help with my previous inquiry.",
        timestamp: "7:31 AM",
        deliveryStatus: "read",
      },
      {
        id: "m4",
        role: "ai",
        content: "Of course! Could you share more details about your previous inquiry so I can better assist you?",
        timestamp: "7:31 AM",
        deliveryStatus: "read",
      },
      {
        id: "m5",
        role: "system",
        content: "Conversation resolved",
        timestamp: "7:45 AM",
      },
    ],
  },
  {
    id: "5",
    user: { id: "u5", name: "Mithul", email: "mithul@scale.com", avatar: "MI" },
    channel: "gmail",
    lastMessage: "Looking to integrate chatbot with our workflow.",
    lastActivity: "5 hours ago",
    unread: true,
    status: "active",
    sessionId: "sess_8p4e5l9j",
    firstContacted: "Oct 27, 2026",
    summary: {
      text: "Mithul is evaluating ScalePods for a large-scale integration with their internal workflow tools. Technical deep-dive required.",
      intent: "Technical integration evaluation",
      requirements: ["API webhooks", "n8n integration", "Multi-channel routing"],
      meetingStatus: "requested",
      handoffStatus: "none",
    },
    messages: [
      {
        id: "m1",
        role: "system",
        content: "Conversation started via Gmail",
        timestamp: "Oct 27, 2026 · 11:00 AM",
      },
      {
        id: "m2",
        role: "ai",
        content: "Hello! Thanks for your email. How can ScalePods help you today?",
        timestamp: "11:00 AM",
        deliveryStatus: "read",
      },
      {
        id: "m3",
        role: "user",
        content: "Looking to integrate chatbot with our workflow. We use n8n and need webhook support.",
        timestamp: "11:05 AM",
        deliveryStatus: "read",
      },
      {
        id: "m4",
        role: "ai",
        content: "Great news — ScalePods has native webhook support and we have a pre-built n8n node available! You can trigger workflows on any chatbot event including conversation start, message received, meeting booked, and handoff to agent.\n\nWould you like technical documentation or prefer to speak with our integration team?",
        timestamp: "11:06 AM",
        deliveryStatus: "read",
      },
    ],
  },
  {
    id: "6",
    user: { id: "u6", name: "Rahul Sharma", phone: "+91 98765 43210", avatar: "RS" },
    channel: "whatsapp",
    lastMessage: "Thanks for the demo!",
    lastActivity: "1 day ago",
    unread: false,
    status: "resolved",
    sessionId: "sess_2q7f0r5k",
    firstContacted: "Oct 27, 2026",
    assignedAgent: "Dev T.",
    summary: {
      text: "Rahul attended a demo and was impressed. Conversation resolved post-demo.",
      intent: "Post-demo follow-up",
      requirements: ["Enterprise plan", "Dedicated support"],
      meetingStatus: "booked",
      handoffStatus: "completed",
    },
    messages: [
      {
        id: "m1",
        role: "system",
        content: "Conversation started via WhatsApp",
        timestamp: "Oct 27, 2026 · 2:00 PM",
      },
      {
        id: "m2",
        role: "user",
        content: "Hi, just finished the demo. Really impressed with the platform!",
        timestamp: "2:00 PM",
        deliveryStatus: "read",
      },
      {
        id: "m3",
        role: "agent",
        content: "Thanks Rahul! Really glad the demo was helpful. We'll send over the proposal shortly. Feel free to reach out if you have any questions!",
        timestamp: "2:05 PM",
        senderName: "Dev T.",
        deliveryStatus: "read",
      },
      {
        id: "m4",
        role: "user",
        content: "Thanks for the demo!",
        timestamp: "2:06 PM",
        deliveryStatus: "read",
      },
      {
        id: "m5",
        role: "system",
        content: "Conversation resolved",
        timestamp: "2:06 PM",
      },
    ],
  },
]

// ─── Mock Callback Requests ───────────────────────────────────────────────────

export const mockCallbacks: CallbackRequest[] = [
  {
    id: "cb1",
    customer: "James Wilson",
    phone: "+1 (555) 0147",
    requestTime: "Today, 10:30 AM",
    reason: "Wants to discuss enterprise pricing",
    status: "pending",
  },
  {
    id: "cb2",
    customer: "Priya Nair",
    phone: "+91 99887 76655",
    requestTime: "Today, 9:15 AM",
    reason: "Integration support needed for Salesforce",
    status: "attended",
  },
  {
    id: "cb3",
    customer: "Carlos Rivera",
    phone: "+1 (305) 555-0182",
    requestTime: "Yesterday, 4:45 PM",
    reason: "Follow-up on demo — wants a custom proposal",
    status: "pending",
  },
  {
    id: "cb4",
    customer: "Lin Wei",
    phone: "+86 131 0000 8888",
    requestTime: "Yesterday, 2:00 PM",
    reason: "Technical question about data residency",
    status: "not_attended",
  },
]

// ─── Mock Meetings ────────────────────────────────────────────────────────────

export const mockMeetings: Meeting[] = [
  {
    id: "mt1",
    customer: "Sarah Johnson",
    contactInfo: "sarah.j@company.com",
    dateTime: "Thu, Oct 30 · 2:00 PM",
    reason: "Product demo — AI automation",
    status: "scheduled",
  },
  {
    id: "mt2",
    customer: "Alex Morgan",
    contactInfo: "alex.m@startup.io",
    dateTime: "Wed, Oct 29 · 11:00 AM",
    reason: "Startup pricing & onboarding",
    status: "scheduled",
  },
  {
    id: "mt3",
    customer: "Rahul Sharma",
    contactInfo: "+91 98765 43210",
    dateTime: "Tue, Oct 28 · 3:00 PM",
    reason: "Enterprise product overview demo",
    status: "completed",
  },
  {
    id: "mt4",
    customer: "Nina Patel",
    contactInfo: "nina@bigcorp.com",
    dateTime: "Mon, Oct 27 · 10:00 AM",
    reason: "Initial discovery call",
    status: "no_show",
  },
  {
    id: "mt5",
    customer: "Tom Brady",
    contactInfo: "+1 (617) 555-0001",
    dateTime: "Fri, Oct 24 · 1:00 PM",
    reason: "Cancelled — rescheduling needed",
    status: "cancelled",
  },
]

