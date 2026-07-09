export interface Therapist {
  id: string;
  name: string;
  title: string;
  specialties: string[];
  bio: string;
  phone: string;
  bookingUrl: string;
  availability: string;
  languages: string[];
  priceRange: string;
}

export const THERAPISTS: Therapist[] = [
  {
    id: 'tpo',
    name: 'Transcultural Psychosocial Organization',
    title: 'Mental Health Organization',
    specialties: ['Anxiety', 'Depression', 'Trauma', 'Student Issues'],
    bio: 'Nepal\'s leading mental health organization offering counseling, psychiatric services, and community mental health programs. Walk-in and appointment available.',
    phone: '16600186001',
    bookingUrl: 'https://www.tpo.org.np',
    availability: 'Mon–Sat, 9 AM – 5 PM',
    languages: ['Nepali', 'English'],
    priceRange: 'Affordable / Sliding scale',
  },
  {
    id: 'koshish',
    name: 'Koshish Nepal',
    title: 'Mental Health & Psychosocial Support',
    specialties: ['Depression', 'Self-harm', 'Relationship Issues', 'Grief'],
    bio: 'Provides free counseling and psychosocial support for individuals in emotional distress. Specializes in working with young adults and people going through life transitions.',
    phone: '16600101922',
    bookingUrl: 'https://www.koshishnepal.org',
    availability: 'Mon–Fri, 10 AM – 4 PM',
    languages: ['Nepali', 'English'],
    priceRange: 'Free',
  },
  {
    id: 'dr-sita',
    name: 'Dr. Sita Sharma',
    title: 'Clinical Psychologist',
    specialties: ['Anxiety', 'Stress', 'Student Issues', 'Burnout'],
    bio: 'Licensed clinical psychologist with 8+ years of experience working with college students and young professionals. Specializes in cognitive behavioral therapy (CBT).',
    phone: '9841234567',
    bookingUrl: 'https://cal.com/sita-sharma',
    availability: 'Mon–Thu, by appointment',
    languages: ['Nepali', 'English', 'Hindi'],
    priceRange: 'NPR 1,500–2,500/session',
  },
  {
    id: 'mindful-hub',
    name: 'Mindful Hub Nepal',
    title: 'Wellness & Counseling Center',
    specialties: ['Stress', 'Relationship Issues', 'Self-esteem', 'Life Transitions'],
    bio: 'A modern wellness center offering individual counseling, group therapy, and mindfulness workshops. Online and in-person sessions available in Kathmandu.',
    phone: '01-4567890',
    bookingUrl: 'https://www.mindfulhub.com.np',
    availability: 'Mon–Sat, 10 AM – 6 PM',
    languages: ['Nepali', 'English'],
    priceRange: 'NPR 1,000–2,000/session',
  },
  {
    id: 'rajeev',
    name: 'Rajeev Adhikari, LMFT',
    title: 'Licensed Marriage & Family Therapist',
    specialties: ['Relationship Issues', 'Family Conflict', 'Grief', 'Anger'],
    bio: 'Licensed therapist specializing in relationship dynamics, family systems, and grief counseling. Offers both individual and couples sessions via video call.',
    phone: '9851234567',
    bookingUrl: 'https://rajeev-therapy.bookings.com',
    availability: 'Tue–Sat, by appointment',
    languages: ['Nepali', 'English'],
    priceRange: 'NPR 2,000–3,000/session',
  },
];
