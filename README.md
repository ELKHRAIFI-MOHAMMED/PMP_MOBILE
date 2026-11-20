# Application mobile Marchés Publics

Client natif Expo/React Native TypeScript connecté aux API Django REST Framework déjà montées. Les opérations de recherche passent par les routes Django; le mobile n’appelle pas directement les trois services Scraper internes.

## Développement local

1. Copier `.env.example` vers `.env.local` et définir `EXPO_PUBLIC_API_URL` selon l’appareil. Web/iOS Simulator : `http://127.0.0.1:8000/api/v1`; émulateur Android : `http://10.0.2.2:8000/api/v1`; téléphone physique : URL LAN du poste avec Django lié à l’interface réseau.
2. Démarrer le backend Django et les services qu’il utilise selon leurs guides d’exploitation.
3. Installer les dépendances avec `npm ci`.
4. Lancer `npm run web`, `npm run android` ou `npm run ios`.

Les identifiants ne sont jamais inclus dans l’application. La session utilise le jeton DRF existant; Android/iOS stockent uniquement le jeton avec Expo SecureStore. En Web de développement, le jeton reste en mémoire et disparaît au rechargement. Il n’y a pas d’endpoint de rafraîchissement de jeton observé; une réponse HTTP 401 ferme la session.

## Parcours raccordés

- Inscription et connexion client; reprise de session et déconnexion.
- Tableau de bord, recherche/consultation des marchés, lancement d’analyse avec confirmation de transmission à Gemini, favoris et démarrage d’un dossier.
- Dossiers de candidature : exigences et documents, ajout de pièces depuis le sélecteur natif, suivi du traitement, analyse consentie, génération des brouillons et partage sécurisé des fichiers accessibles.
- Estimation par marché, estimation enregistrée, workflow de prix, historique, recommandation et comparaison via API existantes.
- Assistant documentaire par extraits sourcés (endpoint extractif, sans génération Gemini), boîte de notifications, rapports, factures, calendrier, tâches, garanties, abonnement/quotas, documents, modèles, conversion et espace fournisseurs.
- Modules administratifs exposés seulement si le profil indique un rôle administratif; chaque requête demeure contrôlée par les permissions Django.

Les routes admin qui n’ont pas d’API backend correspondante vérifiée restent explicitement indisponibles. L’API mobile d’enregistrement des jetons push n’existe pas dans les routes inspectées : la boîte de notifications backend fonctionne, mais les notifications push distantes ne sont pas activées. Le marketplace expose annonces/favoris; le parcours B2B demandes/devis n’est pas disponible via les API identifiées.

## Sécurité et limites

- Les documents restent téléchargés via des endpoints authentifiés et sont partagés depuis le cache privé temporaire de l’application.
- Les coûts, hypothèses de prix et données entreprise ne sont pas placés dans un cache disque TanStack Query.
- Les opérations IA demandent un consentement explicite. Les résultats de préparation restent des brouillons; aucun document n’est signé et aucune offre n’est déposée.
- Le mode TEST/DEMO est affiché comme tel dans les dossiers et n’est pas présenté comme une recette de marché réel.
- Aucune URL d’API ou clé privée de production n’est embarquée. La production exige `EXPO_PUBLIC_API_URL` en HTTPS.

## Vérification

- `npm run typecheck`
- `npm run lint`
- `npm run build:web`
- `npx expo-doctor` avant génération des builds Android/iOS.

Les comptes EAS, identifiants de bundle/package, secrets de signature, certificat HTTPS et configuration de notifications restent à fournir/configurer avant les builds de distribution. Aucun envoi aux stores n’est effectué par cette application.
