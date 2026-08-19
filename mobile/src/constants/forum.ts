export interface ForumCategory {
  name: string;
  description: string;
}

export const FORUM_CATEGORIES: ForumCategory[] = [
  { name: 'General Discussion', description: 'Open space for everyday thoughts and check-ins' },
  { name: 'Anxiety & Stress Support', description: 'Covers daily pressures, panic, and overwhelm' },
  { name: 'Mood & Depression', description: 'Space for talking through low energy, burnout, or sadness' },
  { name: 'Relationships & Family', description: 'Connections with partners, friends, family, and colleagues' },
  { name: 'Grief & Loss', description: 'Processing bereavement, life changes, or major loss' },
  { name: 'Self-Care & Daily Wellness', description: 'Mindfulness, routine, habits, and physical wellbeing' },
  { name: 'Wins & Encouragement', description: 'Sharing milestones, progress, and positive moments' },
  { name: 'Academic & Work Life', description: 'Managing student stress, career pressure, and workplace balance' },
];

export const FORUM_CATEGORY_NAMES = FORUM_CATEGORIES.map((c) => c.name);

export interface ForumComment {
  _id: string;
  postId: string;
  content: string;
  isAnonymous: boolean;
  status: 'approved' | 'reported';
  authorName: string | null;
  createdAt: string;
}

export interface ForumPostItem {
  _id: string;
  category: string;
  title: string;
  content: string;
  isAnonymous: boolean;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
  comments?: ForumComment[];
}
