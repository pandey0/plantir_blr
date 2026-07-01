// Administrative hierarchy for Greater Bengaluru Authority (GBA)
// BBMP replaced by GBA on 2 September 2025 — 5 City Corporations (North/South/East/West/Central)
// MLA data: 2023 Karnataka Vidhan Sabha election results
// Zone Commissioners: GBA press release (2025)
// GBA/Police commissioners: confirmed 2025

export interface Official {
  role: string;
  name: string;
  department: string;
  contact?: string;
  isPlaceholder: boolean;
}

export interface ZoneAdmin {
  commissioner: Official;
  dcp: Official;
  mp: Official;
  mlas: Official[];   // all assembly constituencies in the zone
}

export interface WardAdmin {
  corporator: Official;
  aee: Official;
  healthOfficer: Official;
}

// ─── CITY-LEVEL ──────────────────────────────────────────────────────────────

export const GBA_OFFICIALS: Official[] = [
  {
    role: 'Chief Commissioner — GBA',
    name: 'Maheshwar Rao M.',
    department: 'Greater Bengaluru Authority',
    contact: '1533',
    isPlaceholder: false,
  },
  {
    role: 'City Police Commissioner',
    name: 'Seemant Kumar Singh',
    department: 'Bengaluru City Police',
    contact: '100',
    isPlaceholder: false,
  },
  {
    role: 'Fire & Emergency Services',
    name: '[Divisional Officer]',
    department: 'Karnataka Fire & Emergency Services',
    contact: '101',
    isPlaceholder: true,
  },
];

// ─── ZONE-LEVEL ──────────────────────────────────────────────────────────────

export const ZONE_ADMIN: Record<string, ZoneAdmin> = {
  north: {
    commissioner: {
      role: 'City Corporation Commissioner',
      name: 'Pommala Sunil Kumar',
      department: 'GBA — Bengaluru North City Corp',
      contact: '080-22660000',
      isPlaceholder: false,
    },
    dcp: {
      role: 'Deputy Commissioner of Police',
      name: '[North Division DCP]',
      department: 'Bengaluru City Police — North Division',
      contact: '080-22942222',
      isPlaceholder: true,
    },
    mp: {
      role: 'MP — Bengaluru North (Lok Sabha)',
      name: 'Shobha Karandlaje',
      department: 'BJP',
      isPlaceholder: false,
    },
    mlas: [
      { role: 'MLA — Yelahanka',        name: 'S.R. Vishwanath',    department: 'BJP', isPlaceholder: false },
      { role: 'MLA — Byatarayanapura',  name: 'Krishna Byregowda',  department: 'INC', isPlaceholder: false },
      { role: 'MLA — Yeshvanthapura',   name: 'S.T. Somashekar',    department: 'BJP', isPlaceholder: false },
      { role: 'MLA — Dasarahalli',      name: 'S. Muniraju',        department: 'BJP', isPlaceholder: false },
      { role: 'MLA — Hebbal',           name: 'Suresha B.S.',       department: 'INC', isPlaceholder: false },
    ],
  },

  south: {
    commissioner: {
      role: 'City Corporation Commissioner',
      name: 'Ramesh K. N.',
      department: 'GBA — Bengaluru South City Corp',
      contact: '080-22660000',
      isPlaceholder: false,
    },
    dcp: {
      role: 'Deputy Commissioner of Police',
      name: '[South Division DCP]',
      department: 'Bengaluru City Police — South Division',
      contact: '080-22294100',
      isPlaceholder: true,
    },
    mp: {
      role: 'MP — Bengaluru South (Lok Sabha)',
      name: 'Tejasvi Surya',
      department: 'BJP',
      isPlaceholder: false,
    },
    mlas: [
      { role: 'MLA — BTM Layout',       name: 'Ramalinga Reddy',    department: 'INC', isPlaceholder: false },
      { role: 'MLA — Jayanagar',        name: 'C.K. Ramamurthy',    department: 'BJP', isPlaceholder: false },
      { role: 'MLA — Bommanahalli',     name: 'Satish Reddy',       department: 'BJP', isPlaceholder: false },
      { role: 'MLA — Bangalore South',  name: 'M. Krishnappa',      department: 'BJP', isPlaceholder: false },
      { role: 'MLA — Anekal',           name: 'B. Shivanna',        department: 'INC', isPlaceholder: false },
      { role: 'MLA — Padmanaba Nagar',  name: 'R. Ashoka',          department: 'BJP', isPlaceholder: false },
    ],
  },

  east: {
    commissioner: {
      role: 'City Corporation Commissioner',
      name: 'Ramesh D. S.',
      department: 'GBA — Bengaluru East City Corp',
      contact: '080-22660000',
      isPlaceholder: false,
    },
    dcp: {
      role: 'Deputy Commissioner of Police',
      name: '[East Division DCP]',
      department: 'Bengaluru City Police — East Division',
      contact: '080-25464100',
      isPlaceholder: true,
    },
    mp: {
      role: 'MP — Bengaluru East (Lok Sabha)',
      name: '[Bengaluru East MP]',
      department: 'Lok Sabha',
      isPlaceholder: true,
    },
    mlas: [
      { role: 'MLA — K.R. Pura',         name: 'B.A. Basavaraj',          department: 'BJP', isPlaceholder: false },
      { role: 'MLA — Sarvagnana Nagar',  name: 'K.J. George',             department: 'INC', isPlaceholder: false },
      { role: 'MLA — C.V. Raman Nagar',  name: 'S. Raghu',                department: 'BJP', isPlaceholder: false },
      { role: 'MLA — Mahadevapura',      name: 'Manjula Limbavalli',       department: 'BJP', isPlaceholder: false },
      { role: 'MLA — Pulakeshi Nagar',   name: 'A.C. Srinivasa',          department: 'INC', isPlaceholder: false },
    ],
  },

  west: {
    commissioner: {
      role: 'City Corporation Commissioner',
      name: 'Dr. Rajendra K. V.',
      department: 'GBA — Bengaluru West City Corp',
      contact: '080-22660000',
      isPlaceholder: false,
    },
    dcp: {
      role: 'Deputy Commissioner of Police',
      name: '[West Division DCP]',
      department: 'Bengaluru City Police — West Division',
      contact: '080-23192100',
      isPlaceholder: true,
    },
    mp: {
      role: 'MP — Bengaluru Central (Lok Sabha)',
      name: '[Bengaluru Central MP]',
      department: 'Lok Sabha',
      isPlaceholder: true,
    },
    mlas: [
      { role: 'MLA — Rajarajeshwari Nagar', name: 'Munirathna Naidu',  department: 'BJP', isPlaceholder: false },
      { role: 'MLA — Rajaji Nagar',         name: 'S. Suresh Kumar',   department: 'BJP', isPlaceholder: false },
      { role: 'MLA — Govindaraja Nagar',    name: 'Priyakrishna',      department: 'INC', isPlaceholder: false },
      { role: 'MLA — Vijaya Nagar',         name: 'M. Krishnappa',     department: 'INC', isPlaceholder: false },
      { role: 'MLA — Mahalaxmi Layout',     name: 'K. Gopalaiah',      department: 'BJP', isPlaceholder: false },
    ],
  },

  central: {
    commissioner: {
      role: 'City Corporation Commissioner',
      name: 'Rajendra Cholan P.',
      department: 'GBA — Bengaluru Central City Corp',
      contact: '080-22660000',
      isPlaceholder: false,
    },
    dcp: {
      role: 'Deputy Commissioner of Police',
      name: '[Central Division DCP]',
      department: 'Bengaluru City Police — Central Division',
      contact: '080-22943100',
      isPlaceholder: true,
    },
    mp: {
      role: 'MP — Bengaluru Central (Lok Sabha)',
      name: '[Bengaluru Central MP]',
      department: 'Lok Sabha',
      isPlaceholder: true,
    },
    mlas: [
      { role: 'MLA — Malleswaram',    name: 'C.N. Ashwathnarayana',    department: 'BJP', isPlaceholder: false },
      { role: 'MLA — Shivaji Nagar',  name: 'Rizwan Arshad',           department: 'INC', isPlaceholder: false },
      { role: 'MLA — Shanti Nagar',   name: 'N.A. Haris',              department: 'INC', isPlaceholder: false },
      { role: 'MLA — Gandhi Nagar',   name: 'Dinesh Gundu Rao',        department: 'INC', isPlaceholder: false },
      { role: 'MLA — Chamarajpet',    name: 'B.Z. Zameer Ahmed Khan',  department: 'INC', isPlaceholder: false },
      { role: 'MLA — Chickpet',       name: 'Uday Garudachar',         department: 'BJP', isPlaceholder: false },
      { role: 'MLA — Basavanagudi',   name: 'Ravi Subramanya',         department: 'BJP', isPlaceholder: false },
    ],
  },
};

// ─── WARD-LEVEL TEMPLATE ─────────────────────────────────────────────────────

export const WARD_ADMIN_TEMPLATE: WardAdmin = {
  corporator: {
    role: 'Ward Corporator (GBA Councillor)',
    name: '[Elected Corporator]',
    department: 'GBA Ward Committee',
    contact: '1533',
    isPlaceholder: true,
  },
  aee: {
    role: 'Asst. Executive Engineer',
    name: '[GBA AEE]',
    department: 'GBA Engineering',
    contact: '1533',
    isPlaceholder: true,
  },
  healthOfficer: {
    role: 'Ward Health Inspector',
    name: '[Health Inspector]',
    department: 'GBA Public Health',
    contact: '1533',
    isPlaceholder: true,
  },
};

// ─── HELPLINES ────────────────────────────────────────────────────────────────

export const HELPLINES = [
  { label: 'GBA / BBMP', number: '1533' },
  { label: 'Police',     number: '100' },
  { label: 'Fire',       number: '101' },
  { label: 'Ambulance',  number: '108' },
  { label: 'Emergency',  number: '112' },
  { label: 'BBMP WA',    number: '9480685700' },
] as const;
