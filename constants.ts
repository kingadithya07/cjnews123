
import { Article, EPaperPage, UserRole, ArticleStatus } from './types';

export const APP_NAME = "Digital Newsroom";

export const MOCK_ARTICLES: Article[] = [
  {
    id: 'a1',
    title: "Global Summit Reaches Historic Agreement on Climate Action",
    subline: "Nations pledge to cut carbon emissions by half within the decade.",
    author: "Elena Fisher",
    category: "World",
    status: ArticleStatus.PUBLISHED,
    publishedAt: new Date().toISOString(),
    imageUrl: "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&q=80&w=800",
    content: `In a landmark decision late yesterday evening, representatives from over 190 nations signed the "Century Accord," promising to reduce carbon emissions by an aggressive 50% within the next decade. 
    
    The summit, held in Geneva, was marked by intense negotiations and last-minute diplomatic maneuvers. "This is not just a document; it is a lifeline for our future generations," stated the UN Secretary-General during the closing ceremony. 
    
    Key takeaways include a complete phase-out of coal by 2035 for developed nations and a trillion-dollar fund to assist developing economies in their transition to green energy. Critics, however, argue that without binding enforcement mechanisms, the accord may lack teeth.
    
    Market reactions were mixed, with renewable energy stocks surging while traditional energy sectors saw a slight dip in early morning trading.`
  },
  {
    id: 'a2',
    title: "Tech Giant Unveils Revolutionary Quantum Chip",
    subline: "The Q-1000 processor promises to solve problems in seconds that would take millennia.",
    author: "Marcus Chen",
    category: "Technology",
    status: ArticleStatus.PUBLISHED,
    publishedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    imageUrl: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=800",
    content: `Silicon Valley was abuzz this morning as NanoCore revealed its latest breakthrough: the Q-1000 processor. Utilizing stable qubits at room temperature, this chip promises to solve problems in seconds that would take traditional supercomputers millennia.
    
    "We are entering the era of practical quantum computing," said NanoCore CEO Sarah Jenkins. The implications for medicine, cryptography, and materials science are profound. Pharmaceutical companies are already lining up to use the tech for protein folding simulations.`
  },
  {
    id: 'a3',
    title: "Local Library Reopens After Major Renovation",
    subline: "Historic downtown building gets a modern glass facelift while preserving its heritage.",
    author: "Emily Blunt",
    category: "Local",
    status: ArticleStatus.PUBLISHED,
    publishedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    imageUrl: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=800",
    content: `After two years of dust and construction noise, the historic City Central Library has reopened its doors. The renovation blends the original 1920s architecture with modern glass structures, creating a light-filled space for community gathering.`
  }
];

export const MOCK_EPAPER: EPaperPage[] = [
  {
    id: 'p1',
    date: new Date().toISOString().split('T')[0],
    pageNumber: 1,
    imageUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=1200", 
    regions: [
      {
        id: 'r1',
        x: 5,
        y: 5,
        width: 90,
        height: 40,
        linkedArticleId: 'a1'
      },
      {
        id: 'r2',
        x: 5,
        y: 50,
        width: 45,
        height: 40,
        linkedArticleId: 'a2'
      }
    ]
  }
];
