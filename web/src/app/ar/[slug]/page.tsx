// Fichier généré par scripts/gen-routes.mjs — ne pas modifier à la main.
import { PageView, pageMetadata, pageParams } from "@/views/pages";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export const generateStaticParams = pageParams;
export async function generateMetadata({ params }: Props) {
  return pageMetadata("ar", (await params).slug);
}
export default async function Page({ params }: Props) {
  return <PageView lang="ar" slug={(await params).slug} />;
}
