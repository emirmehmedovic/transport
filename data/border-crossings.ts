export type BorderCrossingSeed = {
  name: string;
  description: string;
  centerLat: number;
  centerLon: number;
  radius: number;
};

// Names are aligned with official Bosnia/Croatia border crossing naming used in
// government and border-police materials. Coordinates are mapped to the actual
// crossing points from OSM-aligned public map sources.
export const BORDER_CROSSINGS: BorderCrossingSeed[] = [
  {
    name: "Izačić",
    description: "BiH-HR border crossing near Ličko Petrovo Selo",
    centerLat: 44.875152,
    centerLon: 15.764014,
    radius: 900,
  },
  {
    name: "Gradiška",
    description: "BiH-HR border crossing Gradiška - Stara Gradiška",
    centerLat: 45.151172,
    centerLon: 17.246381,
    radius: 1000,
  },
  {
    name: "Bosanski Brod",
    description: "BiH-HR border crossing Bosanski Brod - Slavonski Brod",
    centerLat: 45.1603,
    centerLon: 18.0156,
    radius: 900,
  },
  {
    name: "Svilaj",
    description: "BiH-HR border crossing Svilaj on Corridor Vc",
    centerLat: 45.101563,
    centerLon: 18.304046,
    radius: 1000,
  },
  {
    name: "Orašje",
    description: "BiH-HR border crossing Orašje - Županja",
    centerLat: 45.0721,
    centerLon: 18.6945,
    radius: 900,
  },
  {
    name: "Gorica",
    description: "BiH-HR border crossing Gorica - Vinjani Donji",
    centerLat: 43.421406,
    centerLon: 17.276496,
    radius: 800,
  },
  {
    name: "Klek",
    description: "BiH-HR border crossing Klek - Neum",
    centerLat: 42.94,
    centerLon: 17.579,
    radius: 800,
  },
  {
    name: "Bijača",
    description: "BiH-HR border crossing Bijača - Nova Sela",
    centerLat: 43.123333,
    centerLon: 17.569722,
    radius: 1000,
  },
  {
    name: "Doljani",
    description: "BiH-HR border crossing Doljani - Metković area",
    centerLat: 43.05271,
    centerLon: 17.67519,
    radius: 800,
  },
  {
    name: "Kamensko",
    description: "BiH-HR border crossing Kamensko - Kazaginac",
    centerLat: 43.611944,
    centerLon: 16.973333,
    radius: 900,
  },
  {
    name: "Gradina",
    description: "BiH-HR border crossing Gradina - Jasenovac",
    centerLat: 45.269,
    centerLon: 16.918,
    radius: 800,
  },
  {
    name: "Brčko",
    description: "BiH-HR border crossing Brčko - Gunja",
    centerLat: 44.883,
    centerLon: 18.672,
    radius: 800,
  },
  {
    name: "Novi Grad",
    description: "BiH-HR border crossing Novi Grad - Dvor",
    centerLat: 45.049216,
    centerLon: 16.373952,
    radius: 800,
  },
  {
    name: "Kozarska Dubica",
    description: "BiH-HR border crossing Kozarska Dubica - Hrvatska Dubica",
    centerLat: 45.184243,
    centerLon: 16.808844,
    radius: 800,
  },
  {
    name: "Šamac",
    description: "BiH-HR border crossing Šamac - Slavonski Šamac",
    centerLat: 45.155,
    centerLon: 18.015,
    radius: 800,
  },
  {
    name: "Velika Kladuša",
    description: "BiH-HR border crossing Velika Kladuša - Maljevac",
    centerLat: 45.1976,
    centerLon: 15.79238,
    radius: 900,
  },
];
