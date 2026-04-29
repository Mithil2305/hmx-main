export interface Industry {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  benefits: string[];
}

export const industries: Industry[] = [
  {
    id: 1,
    name: 'Retail Stores',
    slug: 'retail-stores',
    description: 'Revolutionize your retail experience with immersive FPV tours that guide customers through your store layout, showcasing merchandise and special displays in a way that static photos never could.',
    imageUrl: 'https://images.pexels.com/photos/1884581/pexels-photo-1884581.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    benefits: [
      'Increase online to in-store conversion rates',
      'Highlight seasonal displays and promotions',
      'Showcase store layout and navigation',
      'Create memorable brand experiences'
    ]
  },
  {
    id: 2,
    name: 'Restaurants',
    slug: 'restaurants',
    description: 'Take diners on a journey through your restaurant with dynamic FPV tours that capture the ambiance, kitchen, and dining spaces, helping potential customers experience your venue before they visit.',
    imageUrl: 'https://images.pexels.com/photos/6267/menu-restaurant-vintage-table.jpg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    benefits: [
      'Showcase restaurant ambiance and atmosphere',
      'Feature both interior and outdoor seating areas',
      'Highlight kitchen and food preparation areas',
      'Increase reservation rates with immersive previews'
    ]
  },
  {
    id: 3,
    name: 'Hotels & Resorts',
    slug: 'hotels-resorts',
    description: 'Give potential guests an immersive preview of your property with FPV tours that flow seamlessly from lobby to rooms to amenities, capturing the true essence of the guest experience.',
    imageUrl: 'https://images.pexels.com/photos/189296/pexels-photo-189296.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    benefits: [
      'Showcase all room types and amenities',
      'Feature property highlights and unique selling points',
      'Increase direct bookings with engaging content',
      'Reduce inquiries with comprehensive visual information'
    ]
  },
  {
    id: 4,
    name: 'Real Estate',
    slug: 'real-estate',
    description: 'Transform property marketing with fluid FPV tours that guide potential buyers through homes and developments, creating an emotional connection that static photos and traditional videos can\'t match.',
    imageUrl: 'https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    benefits: [
      'Reduce in-person showings to serious buyers only',
      'Create emotional connection with properties',
      'Showcase property flow and spatial relationships',
      'Highlight neighborhood and surrounding amenities'
    ]
  },
  {
    id: 5,
    name: 'Event Venues',
    slug: 'event-venues',
    description: 'Help event planners visualize possibilities with dynamic FPV tours that showcase your venue\'s versatility, from empty spaces to fully decorated setups for different event types.',
    imageUrl: 'https://images.pexels.com/photos/50675/banquet-wedding-society-deco-50675.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    benefits: [
      'Showcase venue versatility and layout options',
      'Feature different event setups and configurations',
      'Highlight technical capabilities and amenities',
      'Increase booking inquiries with immersive content'
    ]
  },
  {
    id: 6,
    name: 'Fitness Centers & Gyms',
    slug: 'fitness-gyms',
    description: 'Break down the intimidation barrier for potential members with engaging FPV tours that showcase your fitness facility, equipment, and class spaces in an approachable way.',
    imageUrl: 'https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    benefits: [
      'Showcase facility cleanliness and equipment variety',
      'Feature class spaces and specialty areas',
      'Reduce new member anxiety with virtual previews',
      'Highlight unique facility features and amenities'
    ]
  },
  {
    id: 7,
    name: 'Automotive Dealerships',
    slug: 'automotive-dealerships',
    description: 'Enhance the car shopping experience with dynamic FPV tours that guide customers through your showroom, service center, and inventory, creating a convenient preview before their visit.',
    imageUrl: 'https://images.pexels.com/photos/1149137/pexels-photo-1149137.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    benefits: [
      'Showcase showroom layout and current inventory',
      'Feature service center and customer amenities',
      'Highlight dealership technology and special features',
      'Create transparency and build trust with customers'
    ]
  },
  {
    id: 8,
    name: 'Educational Institutions',
    slug: 'educational-institutions',
    description: 'Give prospective students and families an authentic look at your campus with immersive FPV tours that capture the energy and environment of your educational institution.',
    imageUrl: 'https://images.pexels.com/photos/207692/pexels-photo-207692.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    benefits: [
      'Showcase campus facilities and learning environments',
      'Feature dormitories and student commons',
      'Highlight special programs and facilities',
      'Create emotional connection with prospective students'
    ]
  },
  {
    id: 9,
    name: 'Warehousing & Industrial',
    slug: 'warehousing-industrial',
    description: 'Demonstrate your operational capabilities with comprehensive FPV tours that showcase your industrial or warehouse facilities, workflow, and specialized equipment to potential clients.',
    imageUrl: 'https://images.pexels.com/photos/236705/pexels-photo-236705.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    benefits: [
      'Showcase facility scale and operational capabilities',
      'Feature specialized equipment and technology',
      'Demonstrate safety protocols and procedures',
      'Reduce in-person site visits for initial inquiries'
    ]
  },
  {
    id: 10,
    name: 'Healthcare Facilities',
    slug: 'healthcare-facilities',
    description: 'Ease patient anxiety with welcoming FPV tours that introduce your healthcare facility, showcasing waiting areas, treatment rooms, and advanced technology in a patient-friendly way.',
    imageUrl: 'https://images.pexels.com/photos/247786/pexels-photo-247786.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    benefits: [
      'Reduce patient anxiety with facility previews',
      'Showcase modern equipment and technology',
      'Highlight comfortable waiting areas and amenities',
      'Create transparency and build trust with patients'
    ]
  }
];