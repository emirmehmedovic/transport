export type RioAssetMapping = {
  assetId: string;
  truckNumber: string;
  label: string;
};

export const RIO_ASSETS: RioAssetMapping[] = [
  {
    assetId: "1ff409c7-f994-48cd-af6d-927dca755f27",
    truckNumber: "A39-T-507",
    label: "FIKRET HASANIĆ - A39-T-507",
  },
  {
    assetId: "25132137-def5-41ab-be7c-d7b7aa25d645",
    truckNumber: "M48-A-209",
    label: "EMIR SINANOVIĆ JAT A1 - M48-A-209",
  },
  {
    assetId: "38d339fc-8f3c-48ad-b516-87d15b4d7509",
    truckNumber: "M48-A-208",
    label: "NERMIN POLUTAN - M48-A-208",
  },
  {
    assetId: "427faca3-666f-4d47-b28f-4df7966e07ba",
    truckNumber: "O28-A-220",
    label: "SEUDIN KADRIĆ - O28-A-220",
  },
  {
    assetId: "6115df22-fb14-42ff-8e05-f7a0fc72a1ae",
    truckNumber: "K85-O-457",
    label: "DAMIR MUMINOVIĆ - K85-O-457",
  },
  {
    assetId: "88ec0899-39e9-4979-a6e7-f9abdd097725",
    truckNumber: "T93-M-747",
    label: "EDIN BEŠLIĆ - T93-M-747",
  },
  {
    assetId: "88f6407c-c928-43a5-8b64-84a56afbe38d",
    truckNumber: "J47-E-603",
    label: "AMER KASUPOVIĆ - J47-E-603",
  },
  {
    assetId: "90d7d42a-0d80-432b-8ef5-9067333e6fd2",
    truckNumber: "E18-J-158",
    label: "SINIŠA EGIĆ - E18-J-158",
  },
  {
    assetId: "9e920f36-ac15-402c-aab6-6555aeb97a94",
    truckNumber: "M52-T-623",
    label: "ZEMIR GRBIĆ - M52-T-623",
  },
  {
    assetId: "a82209ca-7161-487c-83f7-1dd67e112433",
    truckNumber: "T79-M-440",
    label: "RANKO SARAJLIĆ - T79-M-440",
  },
  {
    assetId: "aa6291a9-311b-4d86-8a38-778858a89b25",
    truckNumber: "A49-M-558",
    label: "VEDAD KOZICA - A49-M-558",
  },
  {
    assetId: "af1578bd-7270-4729-a09c-4fdf8e27da75",
    truckNumber: "E17-A-800",
    label: "MILOŠ ĆAPARA - E17-A-800",
  },
  {
    assetId: "b1393999-8183-4cab-b697-0b8ff8cd6537",
    truckNumber: "E17-A-801",
    label: "MIRNES MUŠIĆ - E17-A-801",
  },
  {
    assetId: "b77007f5-4c8c-471d-925f-cc0caff75b9d",
    truckNumber: "O21-E-762",
    label: "ADIN MAČKOVIĆ - O21-E-762",
  },
  {
    assetId: "de2f3dff-14df-4037-8ad2-71a105bc7442",
    truckNumber: "M48-A-210",
    label: "VAHID KRKALIĆ JAT A1 - M48-A-210",
  },
  {
    assetId: "de3c9041-3fa3-4098-afda-250038698409",
    truckNumber: "E17-A-802",
    label: "ZORAN ZOKA DULIĆ - E17-A-802",
  },
  {
    assetId: "edbf9cf3-8ac1-4d06-ae5b-e53cbedd6769",
    truckNumber: "A79-M-892",
    label: "ERNAD OMERBAŠIĆ JAT A1 - A79-M-892",
  },
  {
    assetId: "f055652d-e733-4e74-b763-60616aafcbcc",
    truckNumber: "K03-O-788",
    label: "ELMIN MEMIĆ - K03-O-788",
  },
  {
    assetId: "f6cf7be0-d468-423f-a977-99b465a03567",
    truckNumber: "A39-T-508",
    label: "ELDIN NURKOVIĆ - A39-T-508",
  },
  {
    assetId: "f8313ea4-b95d-4ea1-bfcc-f4f7cebc5be9",
    truckNumber: "M69-O-630",
    label: "BRANKO STANKOVIĆ - M69-O-630",
  },
];

export function findRioAssetByTruckNumber(truckNumber: string) {
  const normalized = truckNumber.trim().toUpperCase();
  return RIO_ASSETS.find((asset) => asset.truckNumber.toUpperCase() === normalized) || null;
}
