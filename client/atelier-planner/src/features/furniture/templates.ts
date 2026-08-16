export interface TemplatePlacement {
  type: string;
  x: number;
  z: number;
  rotY: number;
}

export interface Template {
  name: string;
  icon: string;
  description: string;
  items: TemplatePlacement[];
}

export const TEMPLATES: Template[] = [
  {
    name: 'Bistro',
    icon: 'fa-mug-hot',
    description: 'Round tables + seating',
    items: [
      { type: 'round_table', x: -3.2, z: -1.4, rotY: 0 },
      { type: 'chair', x: -2.4, z: -1.4, rotY: 0 },
      { type: 'chair', x: -4.0, z: -1.4, rotY: 0 },
      { type: 'chair', x: -3.2, z: -0.6, rotY: 0 },
      { type: 'chair', x: -3.2, z: -2.2, rotY: 0 },
      { type: 'round_table', x: 0, z: 0, rotY: 0 },
      { type: 'chair', x: 0.8, z: 0, rotY: 0 },
      { type: 'chair', x: -0.8, z: 0, rotY: 0 },
      { type: 'chair', x: 0, z: 0.8, rotY: 0 },
      { type: 'chair', x: 0, z: -0.8, rotY: 0 },
      { type: 'round_table', x: 3.2, z: 1.4, rotY: 0 },
      { type: 'chair', x: 4.0, z: 1.4, rotY: 0 },
      { type: 'chair', x: 2.4, z: 1.4, rotY: 0 },
      { type: 'chair', x: 3.2, z: 2.2, rotY: 0 },
      { type: 'chair', x: 3.2, z: 0.6, rotY: 0 },
      { type: 'plant', x: -4.8, z: 3.4, rotY: 0 },
      { type: 'plant', x: 4.8, z: 3.4, rotY: 0 },
    ],
  },
  {
    name: 'Co-working',
    icon: 'fa-laptop',
    description: 'Rect tables + laptops',
    items: [
      { type: 'rect_table', x: -2.2, z: 0, rotY: 0 },
      { type: 'chair', x: -2.2, z: -1.0, rotY: 0 },
      { type: 'chair', x: -2.2, z: 1.0, rotY: 0 },
      { type: 'rect_table', x: 2.2, z: 0, rotY: 0 },
      { type: 'chair', x: 2.2, z: -1.0, rotY: 0 },
      { type: 'chair', x: 2.2, z: 1.0, rotY: 0 },
      { type: 'pendant', x: -2.2, z: 0, rotY: 0 },
      { type: 'pendant', x: 2.2, z: 0, rotY: 0 },
      { type: 'plant', x: 4.8, z: -3.4, rotY: 0 },
      { type: 'plant', x: -4.8, z: -3.4, rotY: 0 },
    ],
  },
  {
    name: 'Bar Lounge',
    icon: 'fa-martini-glass-citrus',
    description: 'Counter + stools',
    items: [
      { type: 'counter', x: -1.2, z: -3.0, rotY: 0 },
      { type: 'stool', x: -2.6, z: -1.7, rotY: 0 },
      { type: 'stool', x: -1.6, z: -1.7, rotY: 0 },
      { type: 'stool', x: -0.6, z: -1.7, rotY: 0 },
      { type: 'stool', x: 0.4, z: -1.7, rotY: 0 },
      { type: 'pendant', x: -1.2, z: -3.0, rotY: 0 },
      { type: 'pendant', x: 1.4, z: -3.0, rotY: 0 },
      { type: 'round_table', x: 3.4, z: 1.6, rotY: 0 },
      { type: 'chair', x: 4.2, z: 1.6, rotY: 0 },
      { type: 'chair', x: 3.4, z: 2.4, rotY: 0 },
      { type: 'plant', x: 4.6, z: -3.6, rotY: 0 },
      { type: 'plant', x: -4.6, z: 3.6, rotY: 0 },
    ],
  },
];
