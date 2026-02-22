export interface Quote {
  text: string;
  author: string;
}

export const QUOTES: Quote[] = [
  {
    text: "The successful warrior is the average man, with laser-like focus.",
    author: "Bruce Lee",
  },
  {
    text: "Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus.",
    author: "Alexander Graham Bell",
  },
  {
    text: "It is during our darkest moments that we must focus to see the light.",
    author: "Aristotle",
  },
  {
    text: "The secret of change is to focus all of your energy not on fighting the old, but on building the new.",
    author: "Socrates",
  },
  {
    text: "You can always find a distraction if you're looking for one.",
    author: "Tom Kite",
  },
  {
    text: "Starve your distractions, feed your focus.",
    author: "Daniel Goleman",
  },
  {
    text: "Focus on being productive instead of busy.",
    author: "Tim Ferriss",
  },
  {
    text: "The main thing is to keep the main thing the main thing.",
    author: "Stephen Covey",
  },
  {
    text: "Where focus goes, energy flows.",
    author: "Tony Robbins",
  },
  {
    text: "Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.",
    author: "Buddha",
  },
  {
    text: "Lack of direction, not lack of time, is the problem. We all have twenty-four hour days.",
    author: "Zig Ziglar",
  },
  {
    text: "You will never reach your destination if you stop and throw stones at every dog that barks.",
    author: "Winston Churchill",
  },
  {
    text: "The ability to concentrate and to use time well is everything.",
    author: "Lee Iacocca",
  },
  {
    text: "Be like a postage stamp. Stick to one thing until you get there.",
    author: "Josh Billings",
  },
  {
    text: "One look at an email can rob you of 15 minutes of focus.",
    author: "Jacqueline Leo",
  },
  {
    text: "Multitasking is merely the opportunity to screw up more than one thing at a time.",
    author: "Steve Uzzell",
  },
  {
    text: "The difference between successful people and really successful people is that really successful people say no to almost everything.",
    author: "Warren Buffett",
  },
  {
    text: "Deep work is the ability to focus without distraction on a cognitively demanding task.",
    author: "Cal Newport",
  },
  {
    text: "Almost everything will work again if you unplug it for a few minutes, including you.",
    author: "Anne Lamott",
  },
  {
    text: "Your calm mind is the ultimate weapon against your challenges.",
    author: "Bryant McGill",
  },
  {
    text: "Discipline is choosing between what you want now and what you want most.",
    author: "Abraham Lincoln",
  },
  {
    text: "Action is the foundational key to all success.",
    author: "Pablo Picasso",
  },
  {
    text: "What you stay focused on will grow.",
    author: "Roy T. Bennett",
  },
  {
    text: "Until we can manage time, we can manage nothing else.",
    author: "Peter Drucker",
  },
];

/**
 * Returns a random quote from the pool.
 * Uses Math.random for simplicity (no crypto needed for quotes).
 */
export function getRandomQuote(): Quote {
  const index = Math.floor(Math.random() * QUOTES.length);
  const quote = QUOTES[index];
  if (!quote) {
    return QUOTES[0] as Quote;
  }
  return quote;
}
