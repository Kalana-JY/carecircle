const Resource = require('../models/MentalHealthResource');
const CrisisSupportEntry = require('../models/CrisisSupportEntry');

const RESOURCES = [
  {
    title: 'Understanding Anxiety',
    type: 'article',
    category: 'Anxiety',
    topics: ['anxiety', 'coping'],
    description: 'A calm guide to recognizing early signs of anxiety and gentle ways to respond.',
    content: 'Anxiety often shows up as a racing mind, tight chest, or urge to avoid. Name what you feel, slow your breathing, and choose one small next step.',
    durationMinutes: 6,
    author: 'CareCircle',
    source: 'CareCircle',
  },
  {
    title: 'Guided Body Scan',
    type: 'video',
    category: 'Sleep',
    topics: ['sleep', 'mindfulness'],
    description: 'A short audio-style practice for settling the body before rest.',
    url: 'https://www.youtube.com/results?search_query=guided+body+scan+meditation',
    durationMinutes: 10,
  },
  {
    title: 'Journaling for Clarity',
    type: 'article',
    category: 'Stress',
    topics: ['stress', 'reflection'],
    description: 'Write one page about what feels heavy, then one sentence about what would help.',
    content: 'Set a timer for five minutes. Write without editing. End with: the next kind thing I can do is...',
    durationMinutes: 8,
  },
  {
    title: 'Deep Breathing Exercise',
    type: 'video',
    category: 'Anxiety',
    topics: ['anxiety', 'breathing'],
    description: 'A three-minute breathing practice you can use in the moment.',
    url: 'https://www.youtube.com/results?search_query=3+minute+breathing+exercise',
    durationMinutes: 3,
  },
  {
    title: 'Managing Academic Stress',
    type: 'self-help-guide',
    category: 'Stress',
    topics: ['stress', 'student life'],
    description: 'A short guide for study pressure, sleep, and asking for support.',
    content: 'Break the next task into one small step, take a short walk, and tell one person what you need.',
    durationMinutes: 12,
    steps: [
      { title: 'Name the pressure', body: 'Write the assignment or worry in one sentence.', order: 1 },
      { title: 'Choose one step', body: 'Pick the smallest action that moves it forward.', order: 2 },
      { title: 'Rest on purpose', body: 'Step away from the screen for ten minutes.', order: 3 },
    ],
  },
];

const ENTRIES = [
  {
    name: 'City General Hospital',
    type: 'hospital',
    description: 'Emergency room and urgent mental health assessment.',
    phone: '0112691111',
    address: '12 Harbor Road',
    city: 'Metropolis',
    hours: 'Open 24/7',
    is24Hours: true,
    isEmergency: true,
    location: { type: 'Point', coordinates: [-74.006, 40.7128] },
  },
  {
    name: 'Hope Counseling Center',
    type: 'counselor',
    description: 'Walk-in clinic for counseling support.',
    phone: '0112682222',
    address: '48 Elm Street',
    city: 'Metropolis',
    hours: 'Closes at 8 PM',
    location: { type: 'Point', coordinates: [-74.01, 40.715] },
  },
  {
    name: 'Safe Haven Shelter',
    type: 'organization',
    description: 'Emergency shelter and overnight support.',
    phone: '0112673333',
    address: '9 River Lane',
    city: 'Metropolis',
    hours: 'Open 24/7',
    is24Hours: true,
    location: { type: 'Point', coordinates: [-73.998, 40.709] },
  },
  {
    name: 'National Crisis Line',
    type: 'helpline',
    description: 'Free, confidential support available 24/7.',
    phone: '1926',
    isEmergency: true,
    is24Hours: true,
    city: 'Metropolis',
  },
  {
    name: 'Text Support Line',
    type: 'helpline',
    description: 'Text HOME to connect with a crisis counselor.',
    phone: '741741',
    is24Hours: true,
    city: 'Metropolis',
  },
];

const seedSupportLibrary = async () => {
  if ((await Resource.countDocuments()) === 0) {
    await Resource.insertMany(RESOURCES);
    console.log('Seeded mental health resources');
  }
  if ((await CrisisSupportEntry.countDocuments()) === 0) {
    await CrisisSupportEntry.insertMany(ENTRIES);
    console.log('Seeded crisis support directory');
  }
};

module.exports = { seedSupportLibrary };
