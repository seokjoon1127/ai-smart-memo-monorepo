import { mockDocs } from "@/data/mockDocs";
import type { ShareBoxDoc } from "@/data/mockDocs";

export async function listShareBoxDocs(): Promise<ShareBoxDoc[]> {
  return mockDocs;
}
