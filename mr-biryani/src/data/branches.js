// Branch details for the website. Edit here when a branch changes; the Branches page reads from this file.
//
// Source: listings compiled from Zomato, Magicpin, Justdial and Restaurant Guru, cross-checked against the
// website's own Contact page. Ratings and "cost for two" are left out on purpose: the listings disagree on them.
// Confirm hours and phone numbers with each branch before going live.
//
// The "Maruthi Nagar" listing and the BTM Layout listing share one address (75/14A, 1st Cross, Maruthi Nagar
// Main Road), so they are shown as one branch.

export const BRANCHES = [
  {
    id: 'btm',
    name: 'BTM Layout',
    area: 'BTM 1st Stage · Maruthi Nagar',
    address:
      '1st Cross, 75/14A, Maruthi Nagar Main Road, near Surya Sweets, Madiwala New Extension, BTM 1st Stage, Bengaluru 560068',
    phone: '+918884866644',
    phoneDisplay: '+91 88848 66644',
    hours: '12:30 PM – 11:00 PM',
    cuisine: 'Andhra · Hyderabadi · Chinese · Indo-Chinese',
    highlights: ['Andhra-style biryani and fry', 'Lollipop Biryani', 'Mutton Ghee Roast', 'Indoor seating', 'Takeaway'],
    mapQuery: 'Mr. Biriyani BTM Layout Bengaluru',
  },
  {
    id: 'hsr',
    name: 'HSR Layout',
    area: 'Sector 6',
    address: '219, 9th Main Road, 15th A Cross Road, Sector 6, HSR Layout, Bengaluru',
    phone: '+919606407777',
    phoneDisplay: '+91 96064 07777',
    hours: '11:00 AM – 12:00 AM (midnight)',
    cuisine: 'Biryani · Sichuan · Fast food',
    highlights: ['Good vegetarian options', 'Indoor seating', 'Home delivery', 'Takeaway'],
    mapQuery: 'Mr. Biriyani HSR Layout Bengaluru',
  },
  {
    id: 'hosur-road',
    name: 'Hosur Road (SG Palya)',
    area: 'Venkateshwara Layout, near Srinivasa Theatre',
    address: '19/9-1, Ground Floor, SG Palya, Venkateshwara Layout, near Srinivasa Theatre, Hosur Road, Bengaluru',
    phone: '+919398912756',
    phoneDisplay: '+91 93989 12756',
    hours: 'Opens 12:45 PM',
    cuisine: 'Andhra · Biryani',
    highlights: ['Indoor seating', 'Home delivery', 'Takeaway'],
    mapQuery: 'Mr. Biriyani SG Palya Hosur Road Bengaluru',
  },
  {
    id: 'marathahalli',
    name: 'Marathahalli',
    area: 'Anand Nagar',
    address: 'Anand Nagar, near Hindusthan College, 11th Cross Road, Marathahalli, Bengaluru',
    phone: '',
    phoneDisplay: '',
    hours: '12:00 PM – 11:30 PM',
    cuisine: 'Biryani · South Indian',
    highlights: ['Affordable biryani', 'Home delivery'],
    mapQuery: 'Mr. Biriyani Marathahalli Bengaluru',
  },
]
