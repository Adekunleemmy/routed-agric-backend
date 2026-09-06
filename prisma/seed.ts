import { PrismaClient, Role, ProduceStatus, OrderStatus, NegotiationType, NegotiationStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Starting database seed...');

  // Clean existing records in correct relation order
  await prisma.pestMessage.deleteMany();
  await prisma.pestDiagnosis.deleteMany();
  await prisma.savedKnowledge.deleteMany();
  await prisma.message.deleteMany();
  await prisma.orderNegotiation.deleteMany();
  await prisma.order.deleteMany();
  await prisma.produceListing.deleteMany();
  await prisma.farmerProfile.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = await bcrypt.hash('Password123!', 10);

  // 1. Create Farmer User
  const farmer = await prisma.user.create({
    data: {
      id: 'usr_farmer_01',
      name: 'Ibrahim Danladi',
      email: 'ibrahim@danladifarms.ng',
      passwordHash: defaultPassword,
      phoneNumber: '+234 803 123 4567',
      role: Role.farmer,
      state: 'Lagos',
      lga: 'Epe',
      profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      farmerProfile: {
        create: {
          farmName: 'GreenHaven Agro & Farms',
          farmLocation: 'Km 12, Itoikin Road, Epe, Lagos',
          description: 'Specializing in fresh organic vegetables, high-yield tubers, and certified post-harvest handling.',
          rating: 4.9,
          isVerified: true
        }
      }
    }
  });

  // 2. Create Buyer User
  const buyer = await prisma.user.create({
    data: {
      id: 'usr_buyer_01',
      name: 'Fatima Adeyemi',
      email: 'fatima@foodhublagos.com',
      passwordHash: defaultPassword,
      phoneNumber: '+234 812 987 6543',
      role: Role.buyer,
      state: 'Lagos',
      lga: 'Lekki',
      profilePicture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    }
  });

  // 3. Create Admin User
  await prisma.user.create({
    data: {
      id: 'usr_admin_01',
      name: 'RUUTED Super Admin',
      email: 'admin@ruuted.ng',
      passwordHash: defaultPassword,
      phoneNumber: '+234 800 000 0001',
      role: Role.admin,
      state: 'Abuja',
      lga: 'Municipal',
      profilePicture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
    }
  });

  console.log('[Seed] Users and Farmer Profile created');

  // 4. Create Produce Listings
  const listing1 = await prisma.produceListing.create({
    data: {
      id: 'prod_01',
      farmerId: farmer.id,
      productName: 'Fresh Roma Farm Tomatoes',
      category: 'Vegetables',
      description: 'Freshly harvested vine-ripened Roma tomatoes. Firm, rich red color, high shelf-life, and perfect for wholesale markets, retail distribution, and paste processing.',
      quantityAvailable: 120,
      unit: 'crate',
      pricePerUnit: 24000,
      state: 'Lagos',
      lga: 'Epe',
      harvestDate: new Date('2026-03-01'),
      images: [
        'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80'
      ],
      status: ProduceStatus.available
    }
  });

  const listing2 = await prisma.produceListing.create({
    data: {
      id: 'prod_02',
      farmerId: farmer.id,
      productName: 'White Garri (Ijebu Fine Grain)',
      category: 'Tubers',
      description: 'Crisp, sour-sweet, perfectly fried Ijebu white garri. Sifted free from chaff with moisture level below 12% for extended storage.',
      quantityAvailable: 85,
      unit: 'sack',
      pricePerUnit: 38000,
      state: 'Ogun',
      lga: 'Ijebu-Ode',
      harvestDate: new Date('2026-02-20'),
      images: [
        'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80'
      ],
      status: ProduceStatus.available
    }
  });

  const listing3 = await prisma.produceListing.create({
    data: {
      id: 'prod_03',
      farmerId: farmer.id,
      productName: 'Benue White Yam Tubers (Medium/Large)',
      category: 'Tubers',
      description: 'Grade-A Zaki Biam export-quality white yams. Dry-cured, firm texture, ideal for commercial food vendors and pounding.',
      quantityAvailable: 350,
      unit: 'tuber',
      pricePerUnit: 4500,
      state: 'Benue',
      lga: 'Gboko',
      harvestDate: new Date('2026-02-10'),
      images: [
        'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600&auto=format&fit=crop&q=80'
      ],
      status: ProduceStatus.available
    }
  });

  const listing4 = await prisma.produceListing.create({
    data: {
      id: 'prod_04',
      farmerId: farmer.id,
      productName: 'Dried Yellow Maize Grains',
      category: 'Grains',
      description: 'Well-winnowed dry yellow corn grains with 13% moisture threshold. Free of weevils and aflatoxins, optimal for poultry feed compounding and flour milling.',
      quantityAvailable: 150,
      unit: 'sack',
      pricePerUnit: 42000,
      state: 'Kaduna',
      lga: 'Zaria',
      harvestDate: new Date('2026-01-25'),
      images: [
        'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&auto=format&fit=crop&q=80'
      ],
      status: ProduceStatus.available
    }
  });

  const listing5 = await prisma.produceListing.create({
    data: {
      id: 'prod_05',
      farmerId: farmer.id,
      productName: 'Fresh Habanero & Cayenne Pepper Mix',
      category: 'Vegetables',
      description: 'Fiery aromatic red and yellow habanero scotch bonnets mixed with fresh cayenne peppers. Packed directly from the farm in aerated breathable bags.',
      quantityAvailable: 60,
      unit: 'sack',
      pricePerUnit: 18500,
      state: 'Oyo',
      lga: 'Ibadan North',
      harvestDate: new Date('2026-02-28'),
      images: [
        'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=600&auto=format&fit=crop&q=80'
      ],
      status: ProduceStatus.available
    }
  });

  console.log('[Seed] Produce listings created');

  // 5. Create Order with Negotiation and Chat History
  const orderId = 'ORD-2026-8841';
  const order = await prisma.order.create({
    data: {
      id: orderId,
      buyerId: buyer.id,
      farmerId: farmer.id,
      listingId: listing1.id,
      quantity: 10,
      unit: 'crate',
      unitPrice: 24000,
      totalAmount: 240000,
      deliveryState: 'Lagos',
      deliveryLga: 'Lekki',
      deliveryAddress: 'Block 4, Lekki Phase 1 Commercial Market, Lagos',
      preferredDate: new Date('2026-03-12'),
      buyerNote: 'Please ensure crates are padded with straw to prevent transit bruising.',
      status: OrderStatus.PENDING,
      escrowFunded: true
    }
  });

  // Create initial chat messages
  await prisma.message.create({
    data: {
      orderId: order.id,
      senderId: 'system',
      text: `Order #${order.id} communication thread. All messages, counter-offers, and delivery updates are protected under RUUTED Escrow.`,
      isMasked: false,
      isRead: true
    }
  });

  await prisma.message.create({
    data: {
      orderId: order.id,
      senderId: buyer.id,
      text: `Hello! I have placed Order #${order.id} for 10 crates of Roma tomatoes. Delivery to Lekki Phase 1. Please confirm when harvesting starts.`,
      isMasked: false,
      isRead: true
    }
  });

  // Create Negotiation Proposal
  const negotiation = await prisma.orderNegotiation.create({
    data: {
      orderId: order.id,
      senderId: farmer.id,
      senderRole: 'farmer',
      type: NegotiationType.PRICE_COUNTER,
      proposedValue: '23500',
      previousValue: '24000',
      status: NegotiationStatus.PENDING
    }
  });

  await prisma.message.create({
    data: {
      orderId: order.id,
      senderId: farmer.id,
      text: 'Proposed new counter-offer price: ₦23,500/unit (previous: ₦24,000) for a 10-crate bulk order.',
      proposalId: negotiation.id,
      isMasked: false,
      isRead: false
    }
  });

  console.log('[Seed] Order, negotiation, and chat thread created');

  // 6. Create Seed Pest Diagnoses
  const diagnosis = await prisma.pestDiagnosis.create({
    data: {
      userId: farmer.id,
      crop: 'Tomato',
      affectedPart: 'Leaves',
      startedAgo: '3 days ago',
      description: 'Curling leaves with yellow edges and small white flies fluttering beneath the foliage.',
      imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80',
      possibleProblem: 'Whitefly Infestation (Bemisia tabaci) & Tomato Yellow Leaf Curl Virus',
      confidence: 'High',
      explanation: 'Curling leaves and small white insect activity indicate active sap-sucking whitefly populations vectoring viral geminiviruses.',
      possibleCauses: [
        'High ambient temperatures and dry conditions favoring rapid whitefly multiplication',
        'Adjacent untreated weeds harboring insect reservoirs'
      ],
      recommendedActions: [
        'Deploy yellow sticky boards (1 trap per 10 square meters) at canopy level.',
        'Spray cold-pressed Neem oil (5ml/L of water + mild organic soap) at sunrise.',
        'Prune and destroy heavily curled lower leaves.'
      ],
      prevention: [
        'Use silver reflective mulch during bed preparation to disorient flying vectors.',
        'Intercrop with marigolds as companion repellent plants.'
      ]
    }
  });

  await prisma.pestMessage.create({
    data: {
      diagnosisId: diagnosis.id,
      sender: 'user',
      text: 'Can I use systemic chemical pesticides like Imidacloprid?'
    }
  });

  await prisma.pestMessage.create({
    data: {
      diagnosisId: diagnosis.id,
      sender: 'ai',
      text: 'When applying any contact or systemic spray, do so strictly before 8:00 AM or after 5:30 PM to prevent leaf scorching and to safeguard beneficial pollinator bees. If tomatoes are already fruiting, adhere strictly to the 7-14 day Pre-Harvest Interval (PHI) stated on the label.'
    }
  });

  // 7. Create Seed Saved Knowledge
  await prisma.savedKnowledge.create({
    data: {
      userId: farmer.id,
      category: 'Crop Production',
      title: 'Optimal Plant Spacing for High-Yield Cassava Cultivation in Nigeria',
      summary: '1m x 1m spacing yielding 10,000 stands/ha, with stem cuttings planted at 45-degree angles to maximize tuber bulk.',
      fullContent: '### Comprehensive Cassava Cultivation Protocol\n\n1. **Land Preparation**: Plough and harrow to a depth of 25-30cm. For poorly drained soils, construct ridges or mounds spaced 1m apart.\n2. **Stem Cutting Selection**: Use healthy 8-10 month old stems (e.g. TME 419, TMS 30572). Cut stakes to 20-25cm with 5-7 active nodes.\n3. **Planting Orientation**: Insert cuttings at a 45-degree angle in well-aerated soil during the onset of rains. Ensure bud eyes face upwards.\n4. **Weed Management**: Apply pre-emergence herbicide within 24 hours of planting, followed by mechanical weeding at 4 and 8 weeks.'
    }
  });

  await prisma.savedKnowledge.create({
    data: {
      userId: farmer.id,
      category: 'Soil & Fertilizer',
      title: 'NPK 15:15:15 Application Timing and Ring Method for Yam Mounds',
      summary: 'Basal ring application 5-8cm away from sprouts at 6-8 weeks after emergence prevents fertilizer scorching.',
      fullContent: '### Yam Mound Fertilizer Optimization\n\n1. **Timing**: Do not apply inorganic fertilizers until the vine has produced vigorous foliage (approx. 6-8 weeks after sprouting).\n2. **Placement**: Dig a shallow 5cm circular furrow around the perimeter of the mound (15cm away from central vine). Distribute 50g of NPK 15:15:15 per mound.\n3. **Cover & Moisture**: Immediately cover with topsoil to prevent volatile nitrogen loss. Ensure soil is moist during application.'
    }
  });

  console.log('[Seed] Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('[Seed Error]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
