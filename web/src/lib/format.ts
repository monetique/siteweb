export const formatDate = (iso?: string | null, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) =>
  iso ? new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Tunis", ...opts }).format(new Date(iso)) : "";

export const formatDateTime = (iso?: string | null) =>
  iso ? new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Tunis", dateStyle: "full", timeStyle: "short" }).format(new Date(iso)) : "";

export const formatEvolution = (n?: number | null) =>
  n === null || n === undefined ? "" : `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toLocaleString("fr-FR")} %`;

export const TENDER_TYPE: Record<string, string> = {
  appel_offres: "Appel d'offres",
  consultation: "Consultation",
  appel_candidatures: "Appel à candidatures",
};
export const TENDER_STATUS: Record<string, string> = {
  ouvert: "Ouvert", cloture: "Clôturé", attribue: "Attribué", infructueux: "Infructueux", annule: "Annulé",
};
export const NEWS_CATEGORY: Record<string, string> = { actualite: "Actualité", evenement: "Évènement", annonce: "Annonce" };
export const FAQ_CATEGORY: Record<string, string> = {
  carte_bancaire: "Carte bancaire", wallet: "Wallet", paysmart: "Paysmart", achat_internet: "Achat sur Internet", glossaire: "Glossaire",
};
export const PARTNER_CATEGORY: Record<string, string> = {
  banque_tunisienne: "Banques tunisiennes", banque_etrangere: "Banques étrangères", client_privatif: "Clients privatifs",
  partenaire_technologique: "Partenaires technologiques", operateur_facturier: "Opérateurs & facturiers",
};
