
import { Article, EPaperPage, UserRole, ArticleStatus } from './types';

export const APP_NAME = "CJ NEWSHUB";

export const MOCK_ARTICLES: Article[] = [
  {
    id: '1',
    title: 'Global Climate Summit Reaches Historic Agreement',
    subline: 'Nations unite to commit to aggressive carbon reduction targets by 2030.',
    author: 'Sarah Jenkins',
    content: '<p>In a landmark decision...</p>',
    categories: ['World', 'Politics'],
    imageUrl: 'https://images.unsplash.com/photo-1621274403997-37aace184f49?auto=format&fit=crop&w=800&q=80',
    publishedAt: new Date().toISOString(),
    status: ArticleStatus.PUBLISHED,
    views: 1250,
    isFeatured: true
  },
  {
    id: '2',
    title: 'Tech Giant Unveils Revolutionary Quantum Chip',
    subline: 'Processing speeds set to increase exponentially with new architecture.',
    author: 'David Chen',
    content: '<p>Silicon Valley was abuzz today...</p>',
    categories: ['Technology'],
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    publishedAt: new Date(Date.now() - 86400000).toISOString(),
    status: ArticleStatus.PUBLISHED,
    views: 980
  },
  {
    id: '3',
    title: 'Local Art Festival Draws Record Crowds',
    subline: 'City center transforms into a vibrant canvas of creativity.',
    author: 'Emily Rose',
    content: '<p>The annual arts festival...</p>',
    categories: ['Culture', 'Local'],
    imageUrl: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=800&q=80',
    publishedAt: new Date(Date.now() - 172800000).toISOString(),
    status: ArticleStatus.PUBLISHED,
    views: 450
  },
  {
    id: '4',
    title: 'Markets Rally as Inflation Data Shows Cooling',
    subline: 'Investors optimistic about economic outlook for the next quarter.',
    author: 'Michael Ross',
    content: '<p>Wall Street closed higher...</p>',
    categories: ['Business'],
    imageUrl: 'https://images.unsplash.com/photo-1611974765270-ca1258634369?auto=format&fit=crop&w=800&q=80',
    publishedAt: new Date(Date.now() - 200000000).toISOString(),
    status: ArticleStatus.PUBLISHED,
    views: 720
  },
  {
    id: '5',
    title: 'Championship Finals: Underdog Team Takes the Cup',
    subline: 'A stunning victory that will go down in history.',
    author: 'Chris Sport',
    content: '<p>In a stunning upset...</p>',
    categories: ['Sports'],
    imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80',
    publishedAt: new Date(Date.now() - 250000000).toISOString(),
    status: ArticleStatus.PUBLISHED,
    views: 1500,
    isFeatured: true
  },
  {
    id: '6',
    title: 'Urban Farming: The Future of City Living',
    subline: 'Rooftop gardens and vertical farms are changing the landscape.',
    author: 'Alex Green',
    content: '<p>Cities are becoming greener...</p>',
    categories: ['Lifestyle'],
    imageUrl: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=800&q=80',
    publishedAt: new Date(Date.now() - 300000000).toISOString(),
    status: ArticleStatus.PUBLISHED,
    views: 600
  }
];

export const MOCK_EPAPER: EPaperPage[] = [
    {
        id: 'p1',
        date: new Date().toISOString().split('T')[0],
        pageNumber: 1,
        imageUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=600&q=80',
        regions: []
    }
];
