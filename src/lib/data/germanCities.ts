export interface GermanCity {
  name: string;
  state: string;
  populationTier: 'metropolis' | 'major' | 'regional';
}

export interface Bundesland {
  id: string;
  name: string;
  cities: string[];
}

export const GERMAN_BUNDESLAENDER: Bundesland[] = [
  {
    id: 'sachsen',
    name: 'Sachsen',
    cities: ['Leipzig', 'Dresden', 'Chemnitz', 'Zwickau', 'Görlitz', 'Plauen', 'Bautzen', 'Freiberg', 'Meißen', 'Pirna']
  },
  {
    id: 'nrw',
    name: 'Nordrhein-Westfalen',
    cities: ['Köln', 'Düsseldorf', 'Dortmund', 'Essen', 'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld', 'Bonn', 'Münster', 'Gelsenkirchen', 'Aachen', 'Krefeld', 'Oberhausen', 'Hagen', 'Hamm']
  },
  {
    id: 'bayern',
    name: 'Bayern',
    cities: ['München', 'Nürnberg', 'Augsburg', 'Regensburg', 'Ingolstadt', 'Würzburg', 'Fürth', 'Erlangen', 'Bamberg', 'Bayreuth', 'Passau', 'Rosenheim', 'Landshut', 'Aschaffenburg']
  },
  {
    id: 'baden-wuerttemberg',
    name: 'Baden-Württemberg',
    cities: ['Stuttgart', 'Mannheim', 'Karlsruhe', 'Freiburg', 'Heidelberg', 'Ulm', 'Heilbronn', 'Pforzheim', 'Reutlingen', 'Konstanz', 'Tübingen', 'Baden-Baden']
  },
  {
    id: 'hessen',
    name: 'Hessen',
    cities: ['Frankfurt am Main', 'Wiesbaden', 'Kassel', 'Darmstadt', 'Offenbach', 'Hanau', 'Gießen', 'Marburg', 'Fulda', 'Rüsselsheim']
  },
  {
    id: 'niedersachsen-bremen',
    name: 'Niedersachsen & Bremen',
    cities: ['Hannover', 'Braunschweig', 'Oldenburg', 'Osnabrück', 'Wolfsburg', 'Göttingen', 'Salzgitter', 'Hildesheim', 'Bremen', 'Bremerhaven']
  },
  {
    id: 'norddeutschland',
    name: 'Schleswig-Holstein & Hamburg',
    cities: ['Hamburg', 'Kiel', 'Lübeck', 'Flensburg', 'Neumünster', 'Norderstedt']
  },
  {
    id: 'ostdeutschland',
    name: 'Thüringen, Sachsen-Anhalt, Brandenburg, MV',
    cities: ['Erfurt', 'Jena', 'Gera', 'Magdeburg', 'Halle (Saale)', 'Potsdam', 'Cottbus', 'Brandenburg an der Havel', 'Rostock', 'Schwerin']
  },
  {
    id: 'suedwest',
    name: 'Rheinland-Pfalz & Saarland',
    cities: ['Mainz', 'Ludwigshafen', 'Koblenz', 'Trier', 'Kaiserslautern', 'Worms', 'Speyer', 'Saarbrücken']
  },
  {
    id: 'berlin',
    name: 'Berlin & Metropolregion',
    cities: ['Berlin', 'Potsdam', 'Oranienburg', 'Bernau', 'Falkensee']
  }
];

export const TOP_METROPOLISES = [
  'Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt am Main',
  'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dresden', 'Dortmund',
  'Essen', 'Nürnberg', 'Hannover'
];
