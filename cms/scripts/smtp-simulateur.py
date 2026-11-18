"""Simulateur SMTP local : reçoit les e-mails de Strapi sans rien envoyer sur Internet.
Chaque e-mail est enregistré dans mails/ (.eml + .html pour aperçu dans un navigateur).
Usage : python3 scripts/smtp-simulateur.py   (écoute sur 127.0.0.1:1025)"""
import asyncio, email, email.policy, pathlib, re, datetime
from aiosmtpd.controller import Controller

OUT = pathlib.Path(__file__).resolve().parent.parent / "mails"
OUT.mkdir(exist_ok=True)

class Handler:
    async def handle_DATA(self, server, session, envelope):
        msg = email.message_from_bytes(envelope.content, policy=email.policy.default)
        stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S-%f")
        slug = re.sub(r"[^a-z0-9]+", "-", (msg["subject"] or "sans-objet").lower())[:50]
        base = OUT / f"{stamp}-{slug}"
        base.with_suffix(".eml").write_bytes(envelope.content)
        html = msg.get_body(("html",))
        if html: base.with_suffix(".html").write_text(html.get_content(), encoding="utf-8")
        print(f"[SMTP] {envelope.mail_from} -> {', '.join(envelope.rcpt_tos)} | {msg['subject']}", flush=True)
        return "250 Message accepted"

if __name__ == "__main__":
    c = Controller(Handler(), hostname="127.0.0.1", port=1025); c.start()
    print(f"Simulateur SMTP prêt sur 127.0.0.1:1025 — e-mails enregistrés dans {OUT}", flush=True)
    try: asyncio.new_event_loop().run_forever()
    except KeyboardInterrupt: c.stop()
