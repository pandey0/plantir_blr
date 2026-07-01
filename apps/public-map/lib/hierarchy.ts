export interface CorporationNode {
  id: string;
  name: string;
  constituencies: string[];
  color: string;
}

export const BANGALORE_HIERARCHY: CorporationNode[] = [
  {
    id: 'north',
    name: 'BENGALURU_NORTH',
    color: '#10b981', // Emerald
    constituencies: [
      '150-YELAHANKA', 
      '152-BYATARAYANAPURA', 
      '153-YESHVANTHAPURA', 
      '155-DASARAHALLI', 
      '158-HEBBAL'
    ]
  },
  {
    id: 'south',
    name: 'BENGALURU_SOUTH',
    color: '#3b82f6', // Blue
    constituencies: [
      '172-B.T.M. LAYOUT', 
      '173-JAYANAGAR', 
      '175-BOMMANAHALLI', 
      '176-BANGALORE SOUTH',
      '177-ANEKAL (SC)',
      '171-PADMANABA NAGAR'
    ]
  },
  {
    id: 'east',
    name: 'BENGALURU_EAST',
    color: '#bc00ff', // Purple
    constituencies: [
      '151-K.R.PURA', 
      '160-SARVARGNA NAGAR', 
      '161-C.V. RAMAN NAGAR (SC)', 
      '174-MAHADEVAPURA (SC)',
      '159-PULAKESHI NAGAR (SC)'
    ]
  },
  {
    id: 'west',
    name: 'BENGALURU_WEST',
    color: '#f59e0b', // Amber
    constituencies: [
      '154-RAJARAJESHWARI NAGAR', 
      '165-RAJAJI NAGAR', 
      '166-GOVINDRAJA NAGAR', 
      '167-VIJAYA NAGAR',
      '156-MAHALAXMI LAYOUT'
    ]
  },
  {
    id: 'central',
    name: 'BENGALURU_CENTRAL',
    color: '#71717a', // Zinc/Gray (Replaced white)
    constituencies: [
      '157-MALLESWARAM',
      '162-SHIVAJI NAGAR', 
      '163-SHANTI NAGAR', 
      '164-GANDHI NAGAR', 
      '168-CHAMARAJPET', 
      '169-CHICKPET', 
      '170-BASAVANAGUDI'
    ]
  }
];
