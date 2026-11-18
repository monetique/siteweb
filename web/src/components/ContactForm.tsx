"use client";

import { useState, type FormEvent } from "react";
import { Icon } from "./Icon";

const SUBJECTS: [string, string][] = [
  ["carte_bancaire", "Carte bancaire"],
  ["switch_monetique", "Switch monétique"],
  ["switch_mobile_wallet", "Switch mobile & Wallet"],
  ["ecommerce_clictopay", "E-commerce – ClicToPay"],
  ["paysmart", "Paysmart – paiement de factures"],
  ["certification", "Certification"],
  ["formation_conseil", "Formation & conseil"],
  ["reclamation_autre", "Réclamation / autre demande"],
];

// Seule la route de dépôt des messages est exposée publiquement (proxy Nginx vers Strapi).
const ENDPOINT = process.env.NEXT_PUBLIC_CONTACT_ENDPOINT || "/api/messages-contact";

const field = "w-full rounded-lg border border-outline-variant/60 bg-surface-container-low px-4 py-3 text-body-md outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20";

export function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "ok" | "error">("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    if (data.website) return; // champ piège anti-robots
    setState("sending");
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { fullName: data.fullName, phone: data.phone, email: data.email, subject: data.subject, message: data.message } }),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      setState("ok");
    } catch {
      setState("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-8 shadow-lg" noValidate={false}>
      <div className="mb-6 flex items-center justify-between border-b border-outline-variant/30 pb-4">
        <h2 className="text-headline-md">Laissez-nous un message</h2>
        <Icon name="mail" className="text-secondary" />
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <label className="block"><span className="mb-1.5 block text-label-sm uppercase">Nom & prénom <span className="text-error">*</span></span>
          <input name="fullName" required maxLength={120} autoComplete="name" className={field} /></label>
        <label className="block"><span className="mb-1.5 block text-label-sm uppercase">Téléphone</span>
          <input name="phone" type="tel" maxLength={30} autoComplete="tel" placeholder="+216" className={field} /></label>
        <label className="block"><span className="mb-1.5 block text-label-sm uppercase">E-mail <span className="text-error">*</span></span>
          <input name="email" type="email" required autoComplete="email" className={field} /></label>
        <label className="block"><span className="mb-1.5 block text-label-sm uppercase">Objet <span className="text-error">*</span></span>
          <select name="subject" required defaultValue="" className={field}>
            <option value="" disabled>Sélectionnez l'objet</option>
            {SUBJECTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select></label>
        <label className="block md:col-span-2"><span className="mb-1.5 block text-label-sm uppercase">Votre message <span className="text-error">*</span></span>
          <textarea name="message" required rows={5} maxLength={5000} className={field} /></label>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      </div>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-body-sm text-on-surface-variant">
          <Icon name="verified_user" className="text-[16px] text-secondary" />
          Les champs marqués d’un astérisque sont obligatoires. Vos données sont traitées conformément à notre politique de protection des données.
        </p>
        <button type="submit" disabled={state === "sending"} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-secondary px-6 py-3 text-label-md text-on-secondary hover:bg-on-secondary-fixed-variant disabled:opacity-60">
          {state === "sending" ? "Envoi…" : "Envoyer"} <Icon name="send" className="text-[18px]" />
        </button>
      </div>
      <div aria-live="polite">
        {state === "ok" && <p className="mt-4 rounded-lg bg-surface-container-low p-3 text-body-sm text-secondary">Merci, votre message a bien été transmis à Monétique Tunisie.</p>}
        {state === "error" && <p className="mt-4 rounded-lg bg-error-container p-3 text-body-sm text-on-error-container">L’envoi a échoué. Vous pouvez nous écrire à contact@monetiquetunisie.com ou appeler le +216 71 155 840.</p>}
      </div>
    </form>
  );
}
