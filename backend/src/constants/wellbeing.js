const WELLBEING_NOTIFICATION_TYPES = ['daily_wellbeing_tip', 'motivational_message'];

const DEFAULT_RECOMMENDATION_DAYS = 30;
const MIN_RECOMMENDATION_DAYS = 7;
const MAX_RECOMMENDATION_DAYS = 90;
const MAX_RECOMMENDATIONS = 6;
const MAX_RECOMMENDED_ACTIVITIES = 6;

const TONES = ['starting', 'low', 'declining', 'steady', 'improving', 'positive'];

const DAILY_TIPS = [
  {
    id: 'tip-water',
    category: 'habit',
    title: 'Start with water',
    body: 'Drink a glass of water before your first screen. A small physical cue makes the rest of the morning easier.',
  },
  {
    id: 'tip-sunlight',
    category: 'habit',
    title: 'Get morning light',
    body: 'Spend a few minutes outside or by a window soon after waking. Daylight helps your energy and sleep later tonight.',
  },
  {
    id: 'tip-walk',
    category: 'movement',
    title: 'Take a ten-minute walk',
    body: 'A short walk counts. You do not need a workout for movement to support your mood.',
  },
  {
    id: 'tip-breath',
    category: 'mindfulness',
    title: 'Pause for four breaths',
    body: 'Inhale for four, hold for four, exhale for six. One round is enough to interrupt a stressful moment.',
  },
  {
    id: 'tip-sleep',
    category: 'rest',
    title: 'Protect the last hour',
    body: 'Dim screens and pick a consistent wind-down. Sleep is one of the strongest supports for mood.',
  },
  {
    id: 'tip-meal',
    category: 'habit',
    title: 'Eat something steady',
    body: 'A regular meal with protein and something fresh keeps energy from crashing later in the day.',
  },
  {
    id: 'tip-connect',
    category: 'connection',
    title: 'Send one message',
    body: 'Text someone you trust, even briefly. Connection is a wellbeing practice, not a reward you earn.',
  },
  {
    id: 'tip-journal',
    category: 'reflection',
    title: 'Name one feeling',
    body: 'Write a single sentence about how you feel right now. Naming a mood makes it easier to respond to.',
  },
  {
    id: 'tip-stretch',
    category: 'movement',
    title: 'Unclench for two minutes',
    body: 'Roll your shoulders, unclench your jaw, and stretch your hands. Tension often shows up in the body first.',
  },
  {
    id: 'tip-boundary',
    category: 'habit',
    title: 'Leave one thing for tomorrow',
    body: 'Choose one non-urgent task to postpone. Protecting your capacity is part of staying well.',
  },
  {
    id: 'tip-nature',
    category: 'outdoors',
    title: 'Step outside once',
    body: 'Change the room you are in, even for five minutes. A change of scene can reset a stuck mood.',
  },
  {
    id: 'tip-gratitude',
    category: 'reflection',
    title: 'Notice one good thing',
    body: 'Write down one thing that went okay today. Small acknowledgements build a kinder record of the day.',
  },
  {
    id: 'tip-kind',
    category: 'connection',
    title: 'Speak to yourself kindly',
    body: 'Replace one harsh thought with the sentence you would offer a friend in the same situation.',
  },
  {
    id: 'tip-log',
    category: 'reflection',
    title: 'Log before the day ends',
    body: 'Record your mood while the day is still fresh. A short log is more useful than a perfect one.',
  },
];

const MOTIVATIONAL_MESSAGES = {
  starting: [
    {
      id: 'motivation-start-1',
      title: 'A first log is enough',
      body: 'You do not need a perfect routine to begin. One honest mood entry starts your wellbeing record.',
    },
    {
      id: 'motivation-start-2',
      title: 'Small steps still count',
      body: 'Showing up today, even briefly, is how a wellbeing practice takes shape.',
    },
  ],
  low: [
    {
      id: 'motivation-low-1',
      title: 'This mood is information',
      body: 'A hard stretch does not erase your progress. Be gentle with yourself and take the next small step.',
    },
    {
      id: 'motivation-low-2',
      title: 'You do not have to do this alone',
      body: 'Low days are a reason to lean on support, rest, and one manageable activity.',
    },
  ],
  declining: [
    {
      id: 'motivation-decline-1',
      title: 'A dip is a signal, not a verdict',
      body: 'Your recent entries show a harder stretch. Slowing down and asking for support is a strong response.',
    },
    {
      id: 'motivation-decline-2',
      title: 'Steady care beats a perfect day',
      body: 'You can still choose one supportive action today, even if your mood has been slipping.',
    },
  ],
  steady: [
    {
      id: 'motivation-steady-1',
      title: 'Steady is a kind of progress',
      body: 'Your mood has been holding. Keeping the habits that already help is worth more than chasing a big change.',
    },
    {
      id: 'motivation-steady-2',
      title: 'Keep the rhythm',
      body: 'Consistency is doing the quiet work. Stay with the routines that make your days feel manageable.',
    },
  ],
  improving: [
    {
      id: 'motivation-up-1',
      title: 'Your effort is showing',
      body: 'Your recent mood history is trending upward. Keep the practices that have been helping.',
    },
    {
      id: 'motivation-up-2',
      title: 'Build on what is working',
      body: 'The lift in your entries is real. Protect the habits behind it rather than adding too much at once.',
    },
  ],
  positive: [
    {
      id: 'motivation-positive-1',
      title: 'Protect the good stretch',
      body: 'Your mood has been in a stronger place. Keep the activities and people that support it.',
    },
    {
      id: 'motivation-positive-2',
      title: 'Share a bit of that energy',
      body: 'A good stretch is a chance to rest, connect, and notice what you want to repeat.',
    },
  ],
};

const ACTIVITY_CATALOG = [
  {
    key: 'box-breathing',
    title: 'Box breathing',
    category: 'Mindfulness',
    durationMinutes: 5,
    fits: ['low', 'declining', 'steady', 'starting'],
    moods: ['anxious', 'stressed', 'overwhelmed', 'worried', 'frustrated'],
    description: 'Breathe in, hold, breathe out, and hold, four counts each.',
  },
  {
    key: 'short-walk',
    title: 'Ten-minute walk',
    category: 'Movement',
    durationMinutes: 10,
    fits: ['low', 'declining', 'steady', 'improving', 'positive', 'starting'],
    moods: ['sad', 'tired', 'bored', 'neutral', 'okay'],
    description: 'Walk at an easy pace, indoors or outside, without turning it into a workout.',
  },
  {
    key: 'message-a-friend',
    title: 'Message someone you trust',
    category: 'Connection',
    durationMinutes: 5,
    fits: ['low', 'declining'],
    moods: ['lonely', 'sad', 'hopeless', 'depressed'],
    description: 'Send a short, honest note. You do not need to explain everything.',
  },
  {
    key: 'gratitude-note',
    title: 'Gratitude note',
    category: 'Reflection',
    durationMinutes: 5,
    fits: ['steady', 'improving', 'positive'],
    moods: ['calm', 'content', 'happy', 'grateful', 'hopeful'],
    description: 'Write down one thing that supported you today.',
  },
  {
    key: 'body-scan',
    title: 'Two-minute body scan',
    category: 'Mindfulness',
    durationMinutes: 2,
    fits: ['low', 'declining', 'steady'],
    moods: ['anxious', 'stressed', 'overwhelmed', 'tired'],
    description: 'Notice your jaw, shoulders, and hands, and let each one soften.',
  },
  {
    key: 'stretch-break',
    title: 'Stretch break',
    category: 'Movement',
    durationMinutes: 8,
    fits: ['steady', 'improving', 'positive', 'starting'],
    moods: ['tired', 'bored', 'neutral', 'okay'],
    description: 'Loosen your neck, shoulders, and hips for a few minutes.',
  },
  {
    key: 'sunlight-break',
    title: 'Sunlight break',
    category: 'Outdoors',
    durationMinutes: 10,
    fits: ['low', 'declining', 'steady', 'starting'],
    moods: ['sad', 'tired', 'depressed', 'meh'],
    description: 'Sit or walk where you can see daylight.',
  },
  {
    key: 'wind-down',
    title: 'Earlier wind-down',
    category: 'Rest',
    durationMinutes: 20,
    fits: ['low', 'declining', 'steady'],
    moods: ['tired', 'stressed', 'anxious', 'overwhelmed'],
    description: 'Set a screen-off time and keep the last part of the evening quiet.',
  },
  {
    key: 'mood-journal',
    title: 'Mood journal prompt',
    category: 'Reflection',
    durationMinutes: 10,
    fits: ['starting', 'steady', 'declining', 'low'],
    moods: ['sad', 'anxious', 'neutral', 'confused'],
    description: 'Finish the sentence: right now I feel this way because...',
  },
];

module.exports = {
  WELLBEING_NOTIFICATION_TYPES,
  DEFAULT_RECOMMENDATION_DAYS,
  MIN_RECOMMENDATION_DAYS,
  MAX_RECOMMENDATION_DAYS,
  MAX_RECOMMENDATIONS,
  MAX_RECOMMENDED_ACTIVITIES,
  TONES,
  DAILY_TIPS,
  MOTIVATIONAL_MESSAGES,
  ACTIVITY_CATALOG,
};
