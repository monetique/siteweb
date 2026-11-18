// Fichier généré par scripts/gen-routes.mjs — ne pas modifier à la main.
import { TenderView, tenderMetadata, tenderParams } from "@/views/tender";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export const generateStaticParams = tenderParams;
export async function generateMetadata({ params }: Props) {
  return tenderMetadata("en", (await params).slug);
}
export default async function Page({ params }: Props) {
  return <TenderView lang="en" slug={(await params).slug} />;
}
