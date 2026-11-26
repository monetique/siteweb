// Fichier généré par scripts/gen-routes.mjs — ne pas modifier à la main.
import { InnovationView, innovationMetadata, innovationParams } from "@/views/solution";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export const generateStaticParams = innovationParams;
export async function generateMetadata({ params }: Props) {
  return innovationMetadata("fr", (await params).slug);
}
export default async function Page({ params }: Props) {
  return <InnovationView lang="fr" slug={(await params).slug} />;
}
