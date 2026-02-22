export interface Quote {
  text: string;
  author: string;
}

export const QUOTES: Quote[] = [
  {
    text: "The secret of getting ahead is getting started.",
    author: "Mark Twain",
  },
  {
    text: "Focus on being productive instead of busy.",
    author: "Tim Ferriss",
  },
  {
    text: "It is during our darkest moments that we must focus to see the light.",
    author: "Aristotle",
  },
  {
    text: "The successful warrior is the average man, with laser-like focus.",
    author: "Bruce Lee",
  },
  {
    text: "Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus.",
    author: "Alexander Graham Bell",
  },
  {
    text: "Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.",
    author: "Buddha",
  },
  {
    text: "You will never reach your destination if you stop and throw stones at every dog that barks.",
    author: "Winston Churchill",
  },
  {
    text: "The main thing is to keep the main thing the main thing.",
    author: "Stephen Covey",
  },
  {
    text: "Starve your distractions, feed your focus.",
    author: "Daniel Goleman",
  },
  {
    text: "Where focus goes, energy flows.",
    author: "Tony Robbins",
  },
  {
    text: "Your future is created by what you do today, not tomorrow.",
    author: "Robert Kiyosaki",
  },
  {
    text: "Discipline is choosing between what you want now and what you want most.",
    author: "Abraham Lincoln",
  },
  {
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
  },
  {
    text: "Action is the foundational key to all success.",
    author: "Pablo Picasso",
  },
  {
    text: "Almost everything will work again if you unplug it for a few minutes, including you.",
    author: "Anne Lamott",
  },
  {
    text: "You don't have to be great to start, but you have to start to be great.",
    author: "Zig Ziglar",
  },
  {
    text: "What you stay focused on will grow.",
    author: "Roy T. Bennett",
  },
  {
    text: "Productivity is never an accident. It is always the result of a commitment to excellence.",
    author: "Paul J. Meyer",
  },
  {
    text: "Lost time is never found again.",
    author: "Benjamin Franklin",
  },
  {
    text: "Either you run the day or the day runs you.",
    author: "Jim Rohn",
  },
  {
    text: "A year from now you may wish you had started today.",
    author: "Karen Lamb",
  },
  {
    text: "The way to get started is to quit talking and begin doing.",
    author: "Walt Disney",
  },
];

/**
 * Return a random motivational quote from the pool.
 */
export function getRandomQuote(): Quote {
  const index = Math.floor(Math.random() * QUOTES.length);
  return QUOTES[index] as Quote;
}
