// Fichier généré par scripts/gen-routes.mjs — ne pas modifier à la main.
import { SolutionView, solutionMetadata, solutionParams } from "@/views/solution";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export const generateStaticParams = solutionParams;
export async function generateMetadata({ params }: Props) {
  return solutionMetadata("ar", (await params).slug);
}
export default async function Page({ params }: Props) {
  return <SolutionView lang="ar" slug={(await params).slug} />;
}
