import { Benefit, FeatureShowcaseProps } from "@/components/features/FeatureShowcase";

// Basic feature information used in the feature cards section
export const features = [
    {
      icon: "👥",
      title: "Real-time Collaboration",
      description: "Code together with teammates in real-time, just like Google Docs for code."
    },
    {
      icon: "🤖",
      title: "Jarvis AI Assistant",
      description: "Get intelligent code suggestions and solutions from our built-in AI assistant."
    },
    {
      icon: "💬",
      title: "Real-time Chat",
      description: "Built-in text chat allows you to discuss code changes, share ideas, and solve problems together without leaving your editor."
    },
    {
      icon: "⚡",
      title: "Instant Execution",
      description: "Run your code instantly in the browser without switching contexts or environments."
    },
];

// Extended feature information used in the "See CodeCollab in Action" section
export const featureShowcases: FeatureShowcaseProps[] = [
  {
    id: "real-time-collaboration",
    emoji: "👥",
    title: "Real-time Collaboration",
    description: "Code together with teammates in real-time, just like Google Docs for code. Multiple users can edit the same file simultaneously, with changes synced instantly across all sessions.",
    videoSource: "/demos/realtime-demo.mp4",
    videoPoster: "",
    gradientFrom: "indigo-50",
    gradientTo: "indigo-100/50",
    benefits: [
      {
        title: "Simultaneous Editing",
        description: "Multiple users can edit the same file with changes synced in real-time"
      },
      {
        title: "Cursor Tracking",
        description: "See your teammates' cursor positions as they type and navigate"
      },
      {
        title: "Collaborative Debugging",
        description: "Find and fix bugs together without screen sharing or context switching"
      },
      {
        title: "Session Persistence",
        description: "Pick up right where you left off with persistent workspaces"
      }
    ]
  },
  {
    id: "jarvis-ai-assistant",
    emoji: "🤖",
    title: "Jarvis AI Assistant",
    description: "Get intelligent code suggestions and solutions from our built-in AI assistant. Jarvis can help debug issues, explain complex code, generate boilerplate, and provide best practices tailored to your project.",
    videoSource: "/demos/complete-jarvis-demo.mp4",
    videoPoster: "",
    gradientFrom: "purple-50",
    gradientTo: "indigo-50",
    benefits: [
      {
        title: "Smart Code Completion",
        description: "Get code suggestions from the AI assistant when you need it"
      },
      {
        title: "Context aware code generation",
        description: "Generate code based on the context of the code you are writing"
      },
      {
        title: "Code Refactoring",
        description: "Get suggestions to improve and optimize your existing code"
      },
      {
        title: "Conversational Help",
        description: "Ask questions about your code and get immediate answers"
      }
    ]
  },
  {
    id: "real-time-chat",
    emoji: "💬",
    title: "Real-time Chat",
    description: "Built-in text chat allows you to discuss code changes, share ideas, and solve problems together without leaving your editor.",
    videoSource: "/demos/chat-demo.mp4",
    videoPoster: "",
    gradientFrom: "blue-50",
    gradientTo: "indigo-50",
    benefits: [
      {
        title: "Integrated Messaging",
        description: "Chat with teammates directly in the editor interface"
      },
      {
        title: "Code References",
        description: "Reference specific lines of code in your conversations"
      },
      {
        title: "Persistent History",
        description: "Browse conversation history to recall previous discussions"
      },
      {
        title: "Jarvis AI Assistant @jarvis",
        description: "Get code suggestions from the AI assistant when you need it by mentioning @jarvis in your chat"
      }
    ]
  },
  {
    id: "instant-execution",
    emoji: "⚡",
    title: "Instant Execution",
    description: "Run your code instantly in the browser without switching contexts or environments. Our integrated runtime supports multiple languages and frameworks, with no setup required.",
    videoSource: "/demos/code-execution-demo.mp4",
    videoPoster: "",
    gradientFrom: "amber-50",
    gradientTo: "orange-50",
    benefits: [
      {
        title: "Code Execution",
        description: "Run your code instantly in the browser without switching contexts or environments"
      },
      {
        title: "Multiple Languages",
        description: "Supports multiple languages such as Python, JavaScript, Rust, and more"
      },
      {
        title: "Console Integration",
        description: "View logs, errors, and debug information in an integrated console"
      },
      {
        title: "Sandbox Environment",
        description: "Run your code in a sandboxed environment with limited access to the system"
      }
    ]
  }
];

// social media links
export const socialMediaLinks = [
    {
        name: "X",
        url: "https://x.com/sami73010",
    },
    {
        name: "GitHub",
        url: "https://github.com/Sami-07",
    },
    {
        name: "LinkedIn",
        url: "https://www.linkedin.com/in/shaikh-abdul-sami-879287211/",
    },
]
