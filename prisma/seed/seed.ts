/**
 * Seed GolfeExpress — données de test réalistes pour le Golfe de Saint-Tropez.
 *
 * IMPORTANT : ce script ne crée PAS les comptes directement dans Prisma
 * (ce serait contourner le trigger auth.users → public."User") — il
 * passe par l'API Supabase Auth pour créer les comptes, puis laisse le
 * trigger SQL synchroniser les lignes public."User" automatiquement.
 * Ensuite il crée les données métier (Pro, Rider, Client, produits, etc.)
 * directement via Prisma.
 *
 * Usage : cd apps/api && npx ts-node ../../prisma/seed/seed.ts
 * (ou via le script npm run prisma:seed)
 */

import { PrismaClient, OrderStatus, PaymentStatus } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis (voir apps/api/.env.local)");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    transport: ws as any,
  },
});

const PASSWORD = "GolfeTest2026!"; // Mot de passe commun pour tous les comptes de test

interface SeedUser {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: "CLIENT" | "PRO" | "RIDER";
}

/**
 * Crée un compte via Supabase Auth avec les métadonnées nécessaires pour
 * que le trigger SQL on_auth_user_created crée la ligne public."User".
 * Retourne l'id du compte créé.
 */
async function createAuthUser(user: SeedUser): Promise<string> {
  // Supprime le compte existant s'il existe déjà (idempotent)
  const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
  const existingUser = existing?.users?.find((u) => u.email === user.email);
  if (existingUser) {
    console.log(`  ↺ Compte existant : ${user.email}`);
    return existingUser.id;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: user.email,
    password: PASSWORD,
    email_confirm: true, // Contourne la confirmation email pour les seeds
    user_metadata: {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
    },
  });

  if (error || !data.user) {
    throw new Error(`Impossible de créer ${user.email} : ${error?.message}`);
  }

  console.log(`  ✅ Compte créé : ${user.email} (${user.role})`);
  return data.user.id;
}

/** Attend que le trigger SQL ait créé la ligne public."User".
 * Si le trigger ne fonctionne pas, crée la ligne manuellement en secours.
 */
async function waitForUser(id: string, maxRetries = 10): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (existing) return;
    await new Promise((r) => setTimeout(r, 500));
  }

  const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);

  if (error || !data.user?.email) {
    throw new Error(`Impossible de récupérer l'utilisateur Auth ${id}`);
  }

  const meta = data.user.user_metadata || {};

  await prisma.user.upsert({
    where: { id },
    update: {},
    create: {
      id,
      email: data.user.email,
      phone: meta.phone ?? "",
      firstName: meta.firstName ?? "",
      lastName: meta.lastName ?? "",
      role: meta.role ?? "CLIENT",
      status: "ACTIVE",
    },
  });

  console.log(`  ✅ User créé manuellement : ${data.user.email}`);
}

async function main() {
  console.log("\n🦎 GolfeExpress — Seed de données de test\n");

  // =========================================================================
  // 1. PARAMÈTRES GLOBAUX
  // =========================================================================
  console.log("📋 Paramètres globaux...");
  const globalSettings = [
    { key: "commission_rate", value: 0.15, description: "Taux de commission plateforme (15%)" },
    { key: "min_delivery_fee", value: 2.9, description: "Frais de livraison minimum (€)" },
    { key: "max_delivery_fee", value: 8.5, description: "Frais de livraison maximum (€)" },
    { key: "service_fee", value: 0.99, description: "Frais de service par commande (€)" },
    { key: "max_delivery_radius_km", value: 15, description: "Rayon de livraison maximum (km)" },
    { key: "platform_name", value: "GolfeExpress", description: "Nom de la plateforme" },
    { key: "support_email", value: "support@golfeexpress.fr", description: "Email du support" },
  ];

  for (const setting of globalSettings) {
    await prisma.globalSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, description: setting.description, updatedBy: "seed" },
      create: { key: setting.key, value: setting.value, description: setting.description, updatedBy: "seed" },
    });
  }
  console.log(`  ✅ ${globalSettings.length} paramètres créés/mis à jour\n`);

  // =========================================================================
  // 2. COMPTES UTILISATEURS
  // =========================================================================
  console.log("👤 Création des comptes (Supabase Auth → trigger → public.User)...");

  const users = [
    { email: "client1@golfetest.fr", firstName: "Sophie", lastName: "Marchand", phone: "+33612345678", role: "CLIENT" as const },
    { email: "client2@golfetest.fr", firstName: "Thomas", lastName: "Durand", phone: "+33623456789", role: "CLIENT" as const },
    { email: "pro1@golfetest.fr", firstName: "Antoine", lastName: "Pellegrini", phone: "+33634567890", role: "PRO" as const },
    { email: "pro2@golfetest.fr", firstName: "Marie", lastName: "Bertolucci", phone: "+33645678901", role: "PRO" as const },
    { email: "pro3@golfetest.fr", firstName: "Jean-Marc", lastName: "Rossignol", phone: "+33656789012", role: "PRO" as const },
    { email: "rider1@golfetest.fr", firstName: "Lucas", lastName: "Bernardi", phone: "+33667890123", role: "RIDER" as const },
    { email: "rider2@golfetest.fr", firstName: "Karim", lastName: "Saidi", phone: "+33678901234", role: "RIDER" as const },
    { email: "admin@golfetest.fr", firstName: "Admin", lastName: "GolfeExpress", phone: "+33600000000", role: "CLIENT" as const },
  ];

  const userIds: Record<string, string> = {};
  for (const user of users) {
    userIds[user.email] = await createAuthUser(user);
  }

  // Attendre que tous les triggers aient tourné
  console.log("\n  ⏳ Synchronisation des triggers SQL...");
  await new Promise((r) => setTimeout(r, 2000));
  for (const [email, id] of Object.entries(userIds)) {
    await waitForUser(id);
  }
  console.log("  ✅ Tous les utilisateurs synchronisés dans public.User\n");

  // Promouvoir l'admin
  await prisma.user.update({
    where: { id: userIds["admin@golfetest.fr"] },
    data: { role: "ADMIN" },
  });

  // =========================================================================
  // 3. PROFILS MÉTIER — Clients
  // =========================================================================
  console.log("🧑 Profils clients...");

  const client1 = await prisma.client.upsert({
    where: { userId: userIds["client1@golfetest.fr"] },
    update: {},
    create: {
      userId: userIds["client1@golfetest.fr"],
      fidelityPoints: 120,
      referralCode: "SOPHIE120",
    },
  });

  const client2 = await prisma.client.upsert({
    where: { userId: userIds["client2@golfetest.fr"] },
    update: {},
    create: {
      userId: userIds["client2@golfetest.fr"],
      fidelityPoints: 45,
      referralCode: "THOMAS45",
    },
  });

  console.log("  ✅ 2 clients créés\n");

  // =========================================================================
  // 4. PROFILS MÉTIER — Commerçants
  // =========================================================================
  console.log("🏪 Profils commerçants...");

  const pro1 = await prisma.pro.upsert({
    where: { userId: userIds["pro1@golfetest.fr"] },
    update: {},
    create: {
      userId: userIds["pro1@golfetest.fr"],
      businessName: "Poke Paradise Sainte-Maxime",
      siret: "89234567800012",
      category: "RESTAURANT",
      phone: "+33634567890",
      emailContact: "contact@pokeparadise-sm.fr",
      description: "Poke bowls frais et sains préparés avec des produits locaux de la côte varoise. Livraison rapide dans tout le Golfe.",
      status: "ACTIVE",
      subscriptionType: "PREMIUM",
      commissionRate: 0.12,
      rating: 4.8,
      ratingCount: 47,
    },
  });

  const pro2 = await prisma.pro.upsert({
    where: { userId: userIds["pro2@golfetest.fr"] },
    update: {},
    create: {
      userId: userIds["pro2@golfetest.fr"],
      businessName: "Boulangerie Bertolucci",
      siret: "78123456700023",
      category: "BOULANGERIE",
      phone: "+33645678901",
      emailContact: "marie@boulangerie-bertolucci.fr",
      description: "Boulangerie artisanale depuis 1987. Pain au levain, viennoiseries, tartes salées. Livraison matin et midi.",
      status: "ACTIVE",
      subscriptionType: "PREMIUM_PLUS",
      commissionRate: 0.10,
      rating: 4.9,
      ratingCount: 89,
    },
  });

  const pro3 = await prisma.pro.upsert({
    where: { userId: userIds["pro3@golfetest.fr"] },
    update: {},
    create: {
      userId: userIds["pro3@golfetest.fr"],
      businessName: "Fleuriste Rossignol",
      siret: "67012345600034",
      category: "FLEURISTE",
      phone: "+33656789012",
      emailContact: "jm@fleuriste-rossignol.fr",
      description: "Bouquets de saison, compositions florales, orchidées. Commandes personnalisées disponibles.",
      status: "ACTIVE",
      subscriptionType: "FREE",
      commissionRate: 0.15,
      rating: 4.6,
      ratingCount: 23,
    },
  });

  console.log("  ✅ 3 commerçants actifs créés\n");

  // =========================================================================
  // 5. ADRESSES
  // =========================================================================
  console.log("📍 Adresses...");

  // Adresses boutiques (Pro)
  const pro1Address = await prisma.address.create({
    data: {
      label: "Boutique",
      street: "12 Avenue Charles de Gaulle",
      zipCode: "83120",
      city: "Sainte-Maxime",
      lat: 43.3084,
      lng: 6.6391,
      proId: pro1.id,
    },
  });

  const pro2Address = await prisma.address.create({
    data: {
      label: "Boutique",
      street: "3 Rue Paul Bert",
      zipCode: "83120",
      city: "Sainte-Maxime",
      lat: 43.3098,
      lng: 6.6378,
      proId: pro2.id,
    },
  });

  const pro3Address = await prisma.address.create({
    data: {
      label: "Boutique",
      street: "8 Boulevard Jean Moulin",
      zipCode: "83120",
      city: "Sainte-Maxime",
      lat: 43.3076,
      lng: 6.6405,
      proId: pro3.id,
    },
  });

  // Adresses de livraison (Clients)
  const client1Address = await prisma.address.create({
    data: {
      label: "Maison",
      street: "27 Impasse des Mimosas",
      zipCode: "83120",
      city: "Sainte-Maxime",
      lat: 43.3125,
      lng: 6.6412,
      userId: userIds["client1@golfetest.fr"],
      isDefault: true,
    },
  });

  const client2Address = await prisma.address.create({
    data: {
      label: "Bureau",
      street: "45 Rue du Port",
      zipCode: "83120",
      city: "Sainte-Maxime",
      lat: 43.3067,
      lng: 6.6388,
      userId: userIds["client2@golfetest.fr"],
      isDefault: true,
    },
  });

  console.log("  ✅ 5 adresses créées\n");

  // Lier les adresses aux Pro.pickupAddressId (adresse de retrait)
  await prisma.pro.update({ where: { id: pro1.id }, data: { pickupAddressId: pro1Address.id } });
  await prisma.pro.update({ where: { id: pro2.id }, data: { pickupAddressId: pro2Address.id } });
  await prisma.pro.update({ where: { id: pro3.id }, data: { pickupAddressId: pro3Address.id } });

  // =========================================================================
  // 6. HORAIRES D'OUVERTURE
  // =========================================================================
  console.log("🕐 Horaires d'ouverture...");

  for (const pro of [pro1, pro2, pro3]) {
    for (let day = 0; day < 7; day++) {
      const isClosed = day === 0; // Fermé le dimanche
      await prisma.openingHours.create({
        data: {
          proId: pro.id,
          dayOfWeek: day,
          openTime: day === 6 ? "09:00" : "11:30",
          closeTime: day === 6 ? "14:00" : "21:00",
          isClosed,
        },
      });
    }
  }
  console.log("  ✅ Horaires créés pour les 3 commerçants\n");

  // =========================================================================
  // 7. PRODUITS
  // =========================================================================
  console.log("🍽️ Produits...");

  // Pro1 — Poke Paradise
  const pokeBowls = [
    { name: "Poke Saumon Avocat", description: "Saumon frais, avocat, concombre, edamame, riz vinaigré", price: 14.90, image: "🍣", category: "Poke Bowls", isFeatured: true },
    { name: "Poke Thon Teriyaki", description: "Thon albacore, sauce teriyaki, mangue, sésame, riz brun", price: 15.50, image: "🐟", category: "Poke Bowls" },
    { name: "Poke Vegan", description: "Tofu mariné, betterave, carottes, quinoa, sauce soja", price: 13.90, image: "🥗", category: "Poke Bowls" },
    { name: "Poke Crevettes Coco", description: "Crevettes marinées lait de coco, ananas, avocat, riz jasmin", price: 15.90, image: "🦐", category: "Poke Bowls", isFeatured: true },
    { name: "Limonade Maison", description: "Citron, menthe fraîche, sirop de sucre de canne", price: 3.50, image: "🍋", category: "Boissons" },
    { name: "Kombucha Gingembre", description: "Kombucha artisanal gingembre-citron, 33cl", price: 4.50, image: "🫚", category: "Boissons" },
  ];

  for (const product of pokeBowls) {
    await prisma.product.create({ data: { ...product, proId: pro1.id, isAvailable: true } });
  }

  // Pro2 — Boulangerie
  const boulangerieProduits = [
    { name: "Pain au Levain", description: "Pain traditionnel au levain naturel, croûte dorée", price: 4.80, image: "🥖", category: "Pains", isFeatured: true },
    { name: "Croissant Beurre", description: "Croissant pur beurre AOP, feuilletage maison", price: 1.60, image: "🥐", category: "Viennoiseries", isFeatured: true },
    { name: "Pain au Chocolat", description: "Pâte feuilletée pur beurre, chocolat noir 70%", price: 1.80, image: "🍫", category: "Viennoiseries" },
    { name: "Tarte aux Légumes", description: "Feuilletée, légumes de saison, fromage de chèvre", price: 6.50, image: "🥧", category: "Tartes" },
    { name: "Brioche Vendéenne", description: "Brioche tressée, beurre et œufs frais", price: 8.90, image: "🍞", category: "Pains" },
    { name: "Macaron Pistache", description: "Macaron pistache de Sicile, ganache maison (x4)", price: 7.20, image: "🟢", category: "Pâtisseries" },
  ];

  for (const product of boulangerieProduits) {
    await prisma.product.create({ data: { ...product, proId: pro2.id, isAvailable: true } });
  }

  // Pro3 — Fleuriste
  const fleuristeProduits = [
    { name: "Bouquet de Saison", description: "Composition florale de saison, 5 à 7 tiges, emballage kraft", price: 25.00, image: "💐", category: "Bouquets", isFeatured: true },
    { name: "Rose Rouge (unité)", description: "Rose de jardin, fraîche du matin", price: 3.50, image: "🌹", category: "Fleurs à l'unité" },
    { name: "Orchidée Phalaenopsis", description: "Orchidée blanche en pot, durée de vie 3-4 mois", price: 35.00, image: "🌸", category: "Plantes" },
    { name: "Bouquet Mariage Mini", description: "Bouquet de mariée compact, roses blanches et gypsophile", price: 65.00, image: "👰", category: "Bouquets", isFeatured: true },
    { name: "Cactus Succulent Mix", description: "Composition de 3 cactus/succulentes en pot céramique", price: 18.00, image: "🌵", category: "Plantes" },
  ];

  for (const product of fleuristeProduits) {
    await prisma.product.create({ data: { ...product, proId: pro3.id, isAvailable: true } });
  }

  console.log("  ✅ 17 produits créés\n");

  // =========================================================================
  // 8. PROFILS MÉTIER — Livreurs
  // =========================================================================
  console.log("🛵 Profils livreurs...");

  const rider1 = await prisma.rider.upsert({
    where: { userId: userIds["rider1@golfetest.fr"] },
    update: {},
    create: {
      userId: userIds["rider1@golfetest.fr"],
      vehicleType: "SCOOTER",
      vehiclePlate: "AB-123-CD",
      idCardFront: "kyc_placeholder",
      idCardBack: "kyc_placeholder",
      iban: "FR7612345678901234567890123",
      status: "ACTIVE",
      isOnline: false,
      currentLat: 43.3084,
      currentLng: 6.6391,
      totalDeliveries: 127,
      totalEarnings: 1847.30,
      rating: 4.7,
      ratingCount: 89,
    },
  });

  const rider2 = await prisma.rider.upsert({
    where: { userId: userIds["rider2@golfetest.fr"] },
    update: {},
    create: {
      userId: userIds["rider2@golfetest.fr"],
      vehicleType: "VELO",
      vehiclePlate: "",
      idCardFront: "kyc_placeholder",
      idCardBack: "kyc_placeholder",
      iban: "FR7698765432109876543210987",
      status: "ACTIVE",
      isOnline: false,
      currentLat: 43.3098,
      currentLng: 6.6378,
      totalDeliveries: 54,
      totalEarnings: 612.80,
      rating: 4.9,
      ratingCount: 41,
    },
  });

  console.log("  ✅ 2 livreurs actifs créés\n");

  // =========================================================================
  // 9. COMMANDES DE DÉMONSTRATION
  // =========================================================================
  console.log("🧾 Commandes de démonstration...");

  const products = await prisma.product.findMany({ where: { proId: pro1.id } });
  const pokeSaumon = products.find((p) => p.name.includes("Saumon"))!;
  const pokeCrevettes = products.find((p) => p.name.includes("Crevettes"))!;

  // Commande 1 — livrée (historique)
  const order1 = await prisma.order.create({
    data: {
      orderNumber: "GE-00000001",
      clientId: client1.id,
      proId: pro1.id,
      riderId: rider1.id,
      fromAddressId: pro1Address.id,
      toAddressId: client1Address.id,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.CAPTURED,
      subtotal: 30.40,
      deliveryFee: 2.90,
      serviceFee: 0.99,
      total: 34.29,
      proEarnings: 26.75,
      riderEarnings: 2.32,
      platformEarnings: 5.22,
      clientNote: "Pas de sésame sur le poke saumon merci",
      placedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      acceptedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 5 * 60000),
      readyAt: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 20 * 60000),
      pickedUpAt: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 25 * 60000),
      deliveredAt: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 40 * 60000),
      items: {
        create: [
          { productId: pokeSaumon.id, productName: pokeSaumon.name, quantity: 1, unitPrice: 14.90, totalPrice: 14.90 },
          { productId: pokeCrevettes.id, productName: pokeCrevettes.name, quantity: 1, unitPrice: 15.90, totalPrice: 15.90 },
        ],
      },
      statusHistory: {
        create: [
          { status: OrderStatus.PENDING, changedBy: "seed", changedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000) },
          { status: OrderStatus.CONFIRMED, changedBy: pro1.userId, changedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 2 * 60000) },
          { status: OrderStatus.PREPARING, changedBy: pro1.userId, changedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 5 * 60000) },
          { status: OrderStatus.READY, changedBy: pro1.userId, changedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 18 * 60000) },
          { status: OrderStatus.RIDER_ASSIGNED, changedBy: rider1.userId, changedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 20 * 60000) },
          { status: OrderStatus.DELIVERED, changedBy: rider1.userId, changedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 40 * 60000) },
        ],
      },
    },
  });

  // Commande 2 — en cours (PREPARING) pour tester le kanban Pro
  const painAuLevain = await prisma.product.findFirst({ where: { proId: pro2.id, name: { contains: "Levain" } } })!;
  const croissant = await prisma.product.findFirst({ where: { proId: pro2.id, name: { contains: "Croissant" } } })!;

  await prisma.order.create({
    data: {
      orderNumber: "GE-00000002",
      clientId: client2.id,
      proId: pro2.id,
      fromAddressId: pro2Address.id,
      toAddressId: client2Address.id,
      status: OrderStatus.PREPARING,
      paymentStatus: PaymentStatus.CAPTURED,
      subtotal: 8.00,
      deliveryFee: 2.90,
      serviceFee: 0.99,
      total: 11.89,
      proEarnings: 7.20,
      riderEarnings: 2.32,
      platformEarnings: 2.37,
      placedAt: new Date(Date.now() - 15 * 60000),
      acceptedAt: new Date(Date.now() - 12 * 60000),
      items: {
        create: [
          { productId: painAuLevain!.id, productName: "Pain au Levain", quantity: 1, unitPrice: 4.80, totalPrice: 4.80 },
          { productId: croissant!.id, productName: "Croissant Beurre", quantity: 2, unitPrice: 1.60, totalPrice: 3.20 },
        ],
      },
      statusHistory: {
        create: [
          { status: OrderStatus.PENDING, changedBy: "seed", changedAt: new Date(Date.now() - 15 * 60000) },
          { status: OrderStatus.CONFIRMED, changedBy: pro2.userId, changedAt: new Date(Date.now() - 12 * 60000) },
          { status: OrderStatus.PREPARING, changedBy: pro2.userId, changedAt: new Date(Date.now() - 10 * 60000) },
        ],
      },
    },
  });

  // Commande 3 — PENDING pour tester l'arrivée en temps réel
  await prisma.order.create({
    data: {
      orderNumber: "GE-00000003",
      clientId: client1.id,
      proId: pro1.id,
      fromAddressId: pro1Address.id,
      toAddressId: client1Address.id,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      subtotal: 13.90,
      deliveryFee: 2.90,
      serviceFee: 0.99,
      total: 17.79,
      proEarnings: 12.23,
      riderEarnings: 2.32,
      platformEarnings: 3.24,
      clientNote: "Sonnez au portail 3",
      placedAt: new Date(Date.now() - 3 * 60000),
      items: {
        create: [
          { productId: products.find((p) => p.name.includes("Vegan"))!.id, productName: "Poke Vegan", quantity: 1, unitPrice: 13.90, totalPrice: 13.90 },
        ],
      },
      statusHistory: {
        create: [
          { status: OrderStatus.PENDING, changedBy: "seed", changedAt: new Date(Date.now() - 3 * 60000) },
        ],
      },
    },
  });

  console.log("  ✅ 3 commandes créées (1 livrée, 1 en cours, 1 en attente)\n");

  // =========================================================================
  // 10. AVIS
  // =========================================================================
  console.log("⭐ Avis clients...");

  await prisma.review.createMany({
    data: [
      {
        clientId: client1.id,
        proId: pro1.id,
        orderId: order1.id,
        rating: 5,
        comment: "Poke incroyable ! Très frais et livraison rapide. Je recommande vivement.",
        proReply: "Merci Sophie ! Ça fait plaisir 😊 À très vite !",
        proRepliedAt: new Date(Date.now() - 24 * 3600 * 1000),
        isVisible: true,
      },
      {
        clientId: client2.id,
        proId: pro2.id,
        orderId: order1.id, // simplification pour le seed
        rating: 5,
        comment: "Le meilleur pain de la région sans hésiter. La brioche est divine.",
        isVisible: true,
      },
    ],
  });

  console.log("  ✅ 2 avis créés\n");

  // =========================================================================
  // RÉSUMÉ
  // =========================================================================
  console.log("═══════════════════════════════════════════════════════════");
  console.log("✅ SEED TERMINÉ — Comptes de test :");
  console.log("");
  console.log("👤 CLIENTS :");
  console.log("   client1@golfetest.fr  / " + PASSWORD);
  console.log("   client2@golfetest.fr  / " + PASSWORD);
  console.log("");
  console.log("🏪 COMMERÇANTS :");
  console.log("   pro1@golfetest.fr     / " + PASSWORD + "  (Poke Paradise, ACTIVE)");
  console.log("   pro2@golfetest.fr     / " + PASSWORD + "  (Boulangerie Bertolucci, ACTIVE)");
  console.log("   pro3@golfetest.fr     / " + PASSWORD + "  (Fleuriste Rossignol, ACTIVE)");
  console.log("");
  console.log("🛵 LIVREURS :");
  console.log("   rider1@golfetest.fr   / " + PASSWORD + "  (Scooter, ACTIVE)");
  console.log("   rider2@golfetest.fr   / " + PASSWORD + "  (Vélo, ACTIVE)");
  console.log("");
  console.log("🛡️ ADMIN :");
  console.log("   admin@golfetest.fr    / " + PASSWORD);
  console.log("═══════════════════════════════════════════════════════════\n");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("❌ Erreur seed :", e);
    await prisma.$disconnect();
    process.exit(1);
  });
