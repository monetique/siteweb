import NextLink from "next/link";
import { getGlobal } from "@/lib/strapi";
import { Icon } from "./Icon";

export async function ContactCard() {
  const g = await getGlobal();
  return (
    <div className="space-y-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm">
      <h2 className="flex items-center gap-2 border-b border-outline-variant/30 pb-3 font-sans text-label-md uppercase tracking-wider">
        <Icon name="contacts" className="text-[20px] text-secondary" />Contact
      </h2>
      <ul className="space-y-2.5 text-body-sm text-on-surface-variant">
        <li className="flex gap-2"><Icon name="support_agent" className="text-[16px] text-secondary" /><a href={`tel:${g.phoneCallCenter?.replace(/\s/g, "")}`} className="hover:text-secondary">{g.phoneCallCenter} (centre d'appel)</a></li>
        <li className="flex gap-2"><Icon name="alternate_email" className="text-[16px] text-secondary" /><a href={`mailto:${g.emailContact}`} className="break-all hover:text-secondary">{g.emailContact}</a></li>
        <li className="flex gap-2"><Icon name="location_on" className="text-[16px] text-secondary" />{g.address}</li>
      </ul>
      <NextLink href="/contact" className="block rounded-lg border border-outline-variant/30 bg-surface-container py-2.5 text-center text-label-md hover:bg-surface-container-high">Nous contacter</NextLink>
    </div>
  );
}
