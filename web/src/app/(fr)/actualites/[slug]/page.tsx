// Fichier généré par scripts/gen-routes.mjs — ne pas modifier à la main.
import { ArticleView, articleMetadata, articleParams } from "@/views/article";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export const generateStaticParams = articleParams;
export async function generateMetadata({ params }: Props) {
  return articleMetadata("fr", (await params).slug);
}
export default async function Page({ params }: Props) {
  return <ArticleView lang="fr" slug={(await params).slug} />;
}
