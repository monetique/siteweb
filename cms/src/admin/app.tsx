import type { StrapiApp } from '@strapi/strapi/admin';

export default {
  config: {
    locales: ['fr'],
    translations: {
      fr: {
        'Auth.form.welcome.title': 'Bienvenue sur le back-office Monétique Tunisie',
        'Auth.form.welcome.subtitle': 'Connectez-vous à votre compte',
      },
    },
    tutorials: false,
    notifications: { releases: false },
  },
  bootstrap(app: StrapiApp) {},
};
