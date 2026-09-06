import http from 'http';
import { io as ClientSocket } from 'socket.io-client';
import { createApp } from '../src/app.js';
import { initSocketServer } from '../src/websocket/orderSocket.js';
import { prisma } from '../src/config/prisma.js';

let server: http.Server;
const TEST_PORT = 5055;
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, extra?: any) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`, extra ? extra : '');
    failedCount++;
  }
}

async function startServer(): Promise<void> {
  const app = createApp();
  server = http.createServer(app);
  initSocketServer(server);
  return new Promise((resolve) => {
    server.listen(TEST_PORT, () => {
      console.log(`[Test Runner] Test server listening on http://localhost:${TEST_PORT}`);
      resolve();
    });
  });
}

async function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    server.close(async () => {
      await prisma.$disconnect();
      resolve();
    });
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🌾 RUUTED PLATFORM - COMPREHENSIVE BACKEND TEST SUITE');
  console.log('======================================================\n');

  await startServer();

  let farmerToken = '';
  let buyerToken = '';
  let createdOrderId = '';
  let proposalId = '';
  let createdListingId = '';
  let pestDiagnosisId = '';

  try {
    // ----------------------------------------------------
    // TEST 1: Health Check
    // ----------------------------------------------------
    console.log('\n--- 1. Health & Status Checks ---');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthJson = await healthRes.json() as any;
    assert(healthRes.status === 200 && healthJson.status === 'online', 'Health endpoint reports online');

    // ----------------------------------------------------
    // TEST 2: Authentication
    // ----------------------------------------------------
    console.log('\n--- 2. Authentication Flow ---');
    // Login with seeded farmer
    const farmerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ibrahim@danladifarms.ng', password: 'Password123!' })
    });
    const farmerLoginJson = await farmerLoginRes.json() as any;
    assert(farmerLoginRes.status === 200 && !!farmerLoginJson.data.token, 'Farmer login successful');
    assert(farmerLoginJson.data.user.role === 'farmer', 'Farmer role auto-detected correctly');
    farmerToken = farmerLoginJson.data.token;

    // Login with seeded buyer
    const buyerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'fatima@foodhublagos.com', password: 'Password123!' })
    });
    const buyerLoginJson = await buyerLoginRes.json() as any;
    assert(buyerLoginRes.status === 200 && !!buyerLoginJson.data.token, 'Buyer login successful');
    assert(buyerLoginJson.data.user.role === 'buyer', 'Buyer role auto-detected correctly');
    buyerToken = buyerLoginJson.data.token;

    // Invalid login
    const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'fatima@foodhublagos.com', password: 'WrongPassword' })
    });
    assert(badLoginRes.status === 401, 'Invalid credentials rejected with 401');

    // Authenticated Profile (GET /auth/me)
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${farmerToken}` }
    });
    const meJson = await meRes.json() as any;
    assert(meRes.status === 200 && meJson.data.email === 'ibrahim@danladifarms.ng', 'GET /auth/me returns farmer profile');
    assert(meJson.data.farmerProfile?.farmName === 'GreenHaven Agro & Farms', 'Farmer profile details linked');

    // Register a new test user
    const randomEmail = `testuser_${Date.now()}@gmail.com`;
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Chioma Okeke',
        email: randomEmail,
        password: 'Password123!',
        phoneNumber: '+234 809 111 2233',
        role: 'buyer',
        state: 'Enugu',
        lga: 'Enugu North'
      })
    });
    const regJson = await regRes.json() as any;
    assert(regRes.status === 201 && !!regJson.data.token, 'New buyer registration successful');

    // ----------------------------------------------------
    // TEST 3: Marketplace Produce Listings
    // ----------------------------------------------------
    console.log('\n--- 3. Marketplace Produce Listings ---');
    // Query all listings
    const listingsRes = await fetch(`${BASE_URL}/listings?category=Vegetables`);
    const listingsJson = await listingsRes.json() as any;
    assert(listingsRes.status === 200 && Array.isArray(listingsJson.data), 'GET /listings with category filter returns array');
    assert(listingsJson.data.length > 0, 'Seeded vegetables found in catalog');

    // Search query
    const searchRes = await fetch(`${BASE_URL}/listings?search=tomato`);
    const searchJson = await searchRes.json() as any;
    assert(searchJson.data.some((l: any) => l.productName.toLowerCase().includes('tomato')), 'Search for "tomato" matches product');

    // Create listing as Farmer
    const newListingRes = await fetch(`${BASE_URL}/listings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`
      },
      body: JSON.stringify({
        productName: 'Organic Sweet Bell Peppers',
        category: 'Vegetables',
        description: 'Locally grown greenhouse bell peppers, pesticide-free and farm fresh.',
        quantityAvailable: 50,
        unit: 'crate',
        pricePerUnit: 15000,
        state: 'Lagos',
        lga: 'Epe',
        harvestDate: '2026-03-05',
        images: ['https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=600']
      })
    });
    const newListingJson = await newListingRes.json() as any;
    assert(newListingRes.status === 201 && !!newListingJson.data.id, 'Farmer created new produce listing');
    createdListingId = newListingJson.data.id;

    // Buyer forbidden from creating listing (Role check)
    const forbiddenListingRes = await fetch(`${BASE_URL}/listings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`
      },
      body: JSON.stringify({
        productName: 'Illegal Produce',
        category: 'Vegetables',
        description: 'Test',
        quantityAvailable: 10,
        unit: 'kg',
        pricePerUnit: 500,
        state: 'Lagos',
        lga: 'Ikeja',
        harvestDate: '2026-03-05',
        images: []
      })
    });
    assert(forbiddenListingRes.status === 403, 'Buyer forbidden from creating listing (403)');

    // Update listing
    const updateListingRes = await fetch(`${BASE_URL}/listings/${createdListingId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`
      },
      body: JSON.stringify({ pricePerUnit: 16000 })
    });
    const updateListingJson = await updateListingRes.json() as any;
    assert(updateListingRes.status === 200 && updateListingJson.data.pricePerUnit === 16000, 'Farmer updated listing price');

    // ----------------------------------------------------
    // TEST 4: Orders & Escrow Pipeline
    // ----------------------------------------------------
    console.log('\n--- 4. Orders & Escrow Lifecycle ---');
    // Create order as Buyer
    const createOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`
      },
      body: JSON.stringify({
        listingId: createdListingId,
        quantity: 5,
        deliveryState: 'Lagos',
        deliveryLga: 'Victoria Island',
        deliveryAddress: 'Plot 12, Adeola Odeku St, Victoria Island',
        preferredDate: '2026-03-15',
        buyerNote: 'Deliver in morning hours'
      })
    });
    const createOrderJson = await createOrderRes.json() as any;
    assert(createOrderRes.status === 201 && createOrderJson.data.status === 'PENDING', 'Buyer placed order in PENDING status');
    assert(createOrderJson.data.totalAmount === 80000, 'Order total calculated correctly (5 * 16,000 = 80,000)');
    createdOrderId = createOrderJson.data.id;

    // Initialize Escrow Payment
    const initPayRes = await fetch(`${BASE_URL}/orders/${createdOrderId}/initialize-payment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    const initPayJson = await initPayRes.json() as any;
    assert(initPayRes.status === 200 && !!initPayJson.data.authorizationUrl, 'Escrow payment initialized with checkout URL');

    // Paystack Webhook Simulation
    const webhookRes = await fetch(`${BASE_URL}/orders/webhook/paystack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'charge.success',
        data: {
          reference: 'REF-TEST-001',
          status: 'success',
          metadata: { orderId: createdOrderId }
        }
      })
    });
    assert(webhookRes.status === 200, 'Paystack escrow webhook processed successfully');

    // Verify order escrow is now funded
    const verifyOrderRes = await fetch(`${BASE_URL}/orders/${createdOrderId}`, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    const verifyOrderJson = await verifyOrderRes.json() as any;
    assert(verifyOrderJson.data.escrowFunded === true, 'Order marked as escrowFunded = true');

    // ----------------------------------------------------
    // TEST 5: Structured Negotiations
    // ----------------------------------------------------
    console.log('\n--- 5. Structured Negotiations ---');
    // Buyer proposes counter-offer price
    const proposeRes = await fetch(`${BASE_URL}/orders/${createdOrderId}/negotiations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`
      },
      body: JSON.stringify({
        type: 'PRICE_COUNTER',
        proposedValue: 14500
      })
    });
    const proposeJson = await proposeRes.json() as any;
    assert(proposeRes.status === 201 && !!proposeJson.data.activeNegotiation, 'Buyer submitted PRICE_COUNTER negotiation proposal');
    proposalId = proposeJson.data.activeNegotiation.id;

    // Farmer accepts negotiation
    const respondRes = await fetch(`${BASE_URL}/orders/${createdOrderId}/negotiations/${proposalId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`
      },
      body: JSON.stringify({ decision: 'ACCEPTED' })
    });
    const respondJson = await respondRes.json() as any;
    assert(respondRes.status === 200, 'Farmer accepted negotiation proposal');
    assert(respondJson.data.items[0].unitPrice === 14500, 'Unit price updated in database to 14,500');
    assert(respondJson.data.totalAmount === 72500, 'Total amount recalculated automatically (5 * 14,500 = 72,500)');

    // Farmer updates status to ACCEPTED
    const acceptOrderRes = await fetch(`${BASE_URL}/orders/${createdOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`
      },
      body: JSON.stringify({ status: 'ACCEPTED' })
    });
    const acceptOrderJson = await acceptOrderRes.json() as any;
    assert(acceptOrderRes.status === 200 && acceptOrderJson.data.status === 'ACCEPTED', 'Farmer accepted order for fulfillment');

    // ----------------------------------------------------
    // TEST 6: Anti-Circumvention & Order Chat
    // ----------------------------------------------------
    console.log('\n--- 6. Anti-Circumvention Security Engine ---');
    // Send message attempting to bypass escrow with Nigerian phone number
    const phoneChatRes = await fetch(`${BASE_URL}/orders/${createdOrderId}/chat/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`
      },
      body: JSON.stringify({
        text: 'Call me on 08031234567 so we can pay cash outside the app.'
      })
    });
    const phoneChatJson = await phoneChatRes.json() as any;
    assert(phoneChatJson.data.isMasked === true, 'Anti-circumvention detected contact exchange (isMasked: true)');
    assert(
      phoneChatJson.data.text.includes('[📞 Phone Number Hidden — Transact on RUUTED for Quality Guarantee]'),
      'Phone number sanitized with RUUTED escrow protection warning'
    );

    // Send message attempting to bypass escrow with email
    const emailChatRes = await fetch(`${BASE_URL}/orders/${createdOrderId}/chat/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`
      },
      body: JSON.stringify({
        text: 'Send the bank receipt to my email directfarmer@agri.ng please.'
      })
    });
    const emailChatJson = await emailChatRes.json() as any;
    assert(emailChatJson.data.isMasked === true, 'Email address circumvention detected');
    assert(
      emailChatJson.data.text.includes('[✉️ Email Hidden — Keep communication on RUUTED]'),
      'Email address sanitized with RUUTED protection warning'
    );

    // Retrieve entire chat
    const getChatRes = await fetch(`${BASE_URL}/orders/${createdOrderId}/chat`, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    const getChatJson = await getChatRes.json() as any;
    assert(getChatRes.status === 200 && getChatJson.data.messages.length >= 4, 'Chat history contains all threaded messages');

    // ----------------------------------------------------
    // TEST 7: AI Crop & Pest Assistant
    // ----------------------------------------------------
    console.log('\n--- 7. AI Crop & Pest Assistant ---');
    const pestRes = await fetch(`${BASE_URL}/pest/diagnose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`
      },
      body: JSON.stringify({
        crop: 'Cassava',
        affectedPart: 'Leaves',
        startedAgo: '2 days ago',
        description: 'Noticeable yellow-green mosaic pattern and curled leaves on several stands.'
      })
    });
    const pestJson = await pestRes.json() as any;
    assert(pestRes.status === 201 && !!pestJson.data.possibleProblem, 'AI Pest diagnostic generated structured problem title');
    assert(pestJson.data.confidence === 'High' || pestJson.data.confidence === 'Moderate', 'Confidence rating provided');
    assert(Array.isArray(pestJson.data.recommendedActions) && pestJson.data.recommendedActions.length > 0, 'Actionable recommendations returned');
    assert(Array.isArray(pestJson.data.prevention) && pestJson.data.prevention.length > 0, 'Long-term prevention techniques returned');
    pestDiagnosisId = pestJson.data.id;

    // Follow-up question to AI Agronomist
    const followUpRes = await fetch(`${BASE_URL}/pest/${pestDiagnosisId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`
      },
      body: JSON.stringify({
        text: 'Should I spray any chemical insecticide immediately?'
      })
    });
    const followUpJson = await followUpRes.json() as any;
    assert(followUpRes.status === 200, 'Follow-up question processed');
    assert(followUpJson.data.messages.length === 2, 'Chat thread records both farmer question and AI Agronomist answer');

    // ----------------------------------------------------
    // TEST 8: AI Agronomy Knowledge Repository
    // ----------------------------------------------------
    console.log('\n--- 8. AI Agronomy Knowledge Repository ---');
    const askRes = await fetch(`${BASE_URL}/knowledge/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'Soil & Fertilizer',
        question: 'When is the best time to apply NPK 15:15:15 to yam mounds?'
      })
    });
    const askJson = await askRes.json() as any;
    assert(askRes.status === 200 && !!askJson.data.answer, 'POST /knowledge/ask returns detailed guide');
    assert(!!askJson.data.summary, 'Agronomic executive summary generated');

    // Save Guide
    const saveGuideRes = await fetch(`${BASE_URL}/knowledge/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`
      },
      body: JSON.stringify({
        category: 'Soil & Fertilizer',
        title: 'Yam Mound Fertilization Best Practices',
        summary: askJson.data.summary,
        fullContent: askJson.data.answer
      })
    });
    const saveGuideJson = await saveGuideRes.json() as any;
    assert(saveGuideRes.status === 201 && !!saveGuideJson.data.id, 'Agronomy guide saved to user offline collection');

    // ----------------------------------------------------
    // TEST 9: Real-time WebSockets
    // ----------------------------------------------------
    console.log('\n--- 9. Real-Time WebSockets ---');
    await new Promise<void>((resolve, reject) => {
      const socket = ClientSocket(`http://localhost:${TEST_PORT}`, {
        transports: ['websocket']
      });

      socket.on('connect', () => {
        assert(true, 'WebSocket client connected successfully');
        socket.emit('join_order_room', createdOrderId);
      });

      socket.on('joined_room', (data: any) => {
        assert(data.orderId === createdOrderId, 'WebSocket client joined order room');

        // Test sending message and receiving live event
        socket.on('new_order_message', (msg: any) => {
          assert(msg.orderId === createdOrderId, 'WebSocket broadcast received in real-time');
          socket.disconnect();
          resolve();
        });

        // Trigger message via REST API
        fetch(`${BASE_URL}/orders/${createdOrderId}/chat/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${buyerToken}`
          },
          body: JSON.stringify({ text: 'Checking live websocket broadcast sync.' })
        });
      });

      socket.on('connect_error', (err) => {
        assert(false, `WebSocket connection error: ${err.message}`);
        socket.disconnect();
        reject(err);
      });

      setTimeout(() => {
        socket.disconnect();
        resolve();
      }, 4000);
    });

    // ----------------------------------------------------
    // TEST 10: OpenAPI Documentation
    // ----------------------------------------------------
    console.log('\n--- 10. Swagger / OpenAPI Documentation ---');
    const docsRes = await fetch(`http://localhost:${TEST_PORT}/api/docs/`);
    assert(docsRes.status === 200, 'GET /api/docs/ returns Swagger UI HTML');

  } catch (err: any) {
    console.error('Fatal test runner error:', err);
    failedCount++;
  } finally {
    await stopServer();
  }

  console.log('\n======================================================');
  console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('======================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
