import { prisma } from "@/lib/prisma";

export async function hasProofOfDelivery(loadId: string) {
  const podDocument = await prisma.document.findFirst({
    where: {
      loadId,
      type: "POD",
    },
    select: {
      id: true,
    },
  });

  return Boolean(podDocument);
}
