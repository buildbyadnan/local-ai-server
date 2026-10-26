/**
 * Mock chat-session data for the Local AI Server UI.
 * This app is completely UI-based: nothing here is fetched from a server.
 */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  at: string;
}

export interface ChatSession {
  id: string;
  title: string;
  model: string;
  created_at: string;
  message_count: number;
  messages: ChatMessage[];
}

export const chatSessions: ChatSession[] = [
  {
    id: "ses_01J8Q2",
    title: "Explain simply: why does my sourdough collapse?",
    model: "llama",
    created_at: "2026-10-26T09:12:04Z",
    message_count: 4,
    messages: [
      {
        role: "user",
        content:
          "My sourdough rises nicely but collapses when I score it. What's happening?",
        at: "2026-10-26T09:12:04Z",
      },
      {
        role: "assistant",
        content:
          "It is almost certainly over-proofing. The gluten network has stretched as far as it can and can no longer hold the gas, so the moment you cut into it, it deflates. Try shortening the final rise by 20-30 minutes, or do the bowl test: press the dough and if the dent stays, it is ready.",
        at: "2026-10-26T09:12:11Z",
      },
      {
        role: "user",
        content: "How does room temperature change this?",
        at: "2026-10-26T09:14:47Z",
      },
      {
        role: "assistant",
        content:
          "Warmer kitchens speed the yeast up dramatically. At 24°C your timing holds; at 28-30°C the same dough can be fully proofed in half the time. A simple rule: every 5°C above 24°C, cut the rise time by about a third.",
        at: "2026-10-26T09:14:55Z",
      },
    ],
  },
  {
    id: "ses_01J8PZ",
    title: "Rewrite my landlord email, firmer but polite",
    model: "llama",
    created_at: "2026-10-25T18:40:22Z",
    message_count: 3,
    messages: [
      {
        role: "user",
        content:
          "Rewrite this email to my landlord about the broken heater. Be polite but make clear I expect a reply within 48 hours.",
        at: "2026-10-25T18:40:22Z",
      },
      {
        role: "assistant",
        content:
          "Subject: Heating not working — reply requested within 48 hours. Hello [Name], I am writing to report that the heating in the flat has not worked since [date]. As you know this is a repair you are legally responsible for, and I would be grateful for a confirmation of the repair date within 48 hours of this message. Kind regards, [Name]",
        at: "2026-10-25T18:40:31Z",
      },
      {
        role: "user",
        content: "Add a line that I have photos of the thermometer reading.",
        at: "2026-10-25T18:43:02Z",
      },
    ],
  },
  {
    id: "ses_01J8M4",
    title: "Compare two job offers in a simple table",
    model: "llama",
    created_at: "2026-10-24T11:05:59Z",
    message_count: 5,
    messages: [
      {
        role: "user",
        content:
          "Offer A: 72k, 3 days in office, 8% bonus. Offer B: 66k, fully remote, 12% bonus. Which is better financially over a year?",
        at: "2026-10-24T11:05:59Z",
      },
      {
        role: "assistant",
        content:
          "Offer A: 72,000 + 5,760 bonus = 77,760. Offer B: 66,000 + 7,920 = 73,920. Offer A wins by 3,840 per year before tax. But Offer B saves commuting costs — if your travel is over about 3,200 per year, the gap closes.",
        at: "2026-10-24T11:06:08Z",
      },
      {
        role: "user",
        content: "Now factor in 45 minutes each way, 3 days a week.",
        at: "2026-10-24T11:08:31Z",
      },
      {
        role: "assistant",
        content:
          "That is about 234 hours a year of travel on top of fares. If you value your time at even minimum wage, Offer A's 3,840 advantage is effectively gone, before a single train ticket.",
        at: "2026-10-24T11:08:40Z",
      },
      {
        role: "user",
        content: "Make it a table I can screenshot.",
        at: "2026-10-24T11:10:02Z",
      },
    ],
  },
  {
    id: "ses_01J8K7",
    title: "Ideas for a 10-year-old's science project",
    model: "llama",
    created_at: "2026-10-23T16:22:10Z",
    message_count: 3,
    messages: [
      {
        role: "user",
        content:
          "Give me 5 science project ideas about water that a 10-year-old can do in one weekend with stuff from home.",
        at: "2026-10-23T16:22:10Z",
      },
      {
        role: "assistant",
        content:
          "1. Rain-gauge from a plastic bottle. 2. Which surface dries fastest (plate, towel, glass) — measure every 30 min. 3. Build a filter from sand, gravel and cotton to clean muddy water. 4. Test whether salt changes how ice melts. 5. Map the damp spots in your garden to find where water pools.",
        at: "2026-10-23T16:22:19Z",
      },
      {
        role: "user",
        content: "Which one has a hypothesis that is easy to write down?",
        at: "2026-10-23T16:24:55Z",
      },
    ],
  },
  {
    id: "ses_01J8H1",
    title: "Debug: my spreadsheet totals are wrong",
    model: "llama",
    created_at: "2026-10-22T08:47:36Z",
    message_count: 4,
    messages: [
      {
        role: "user",
        content:
          "My =SUM range is missing the last row even though I dragged it down. Why?",
        at: "2026-10-22T08:47:36Z",
      },
      {
        role: "assistant",
        content:
          "Two usual suspects: the range was written as a fixed reference (like $A$1:$A$50) so it never expanded, or the last row holds numbers stored as text — SUM ignores those. Check whether the numbers are left-aligned; if they are, they are text.",
        at: "2026-10-22T08:47:45Z",
      },
      {
        role: "user",
        content: "They are left-aligned. How do I convert them all at once?",
        at: "2026-10-22T08:49:12Z",
      },
      {
        role: "assistant",
        content:
          "Put a 1 in an empty cell, copy it, select the offending column, then Paste Special → Multiply. That forces text-numbers into real numbers and the SUM will pick them up.",
        at: "2026-10-22T08:49:20Z",
      },
    ],
  },
  {
    id: "ses_01J8D9",
    title: "Trip plan: three days with no queuing",
    model: "llama",
    created_at: "2026-10-21T20:15:44Z",
    message_count: 2,
    messages: [
      {
        role: "user",
        content:
          "Plan 3 days in a big city focusing on food markets, one museum per day, and nothing that needs booking weeks ahead.",
        at: "2026-10-21T20:15:44Z",
      },
      {
        role: "assistant",
        content:
          "Day 1: market breakfast, then the smallest museum in the city before 10am. Day 2: second market for lunch, an afternoon neighbourhood walk. Day 3: a food hall crawl with one final museum at closing time, when queues are thinnest. Want this as a printable hour-by-hour list?",
        at: "2026-10-21T20:15:53Z",
      },
    ],
  },
];

/** Case-insensitive search over a session's title and message text. */
export function filterSessions(query: string): ChatSession[] {
  const q = query.trim().toLowerCase();
  if (!q) return chatSessions;
  return chatSessions.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.model.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.messages.some((m) => m.content.toLowerCase().includes(q)),
  );
}
