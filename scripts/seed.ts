import pg from "pg";
import * as bcrypt from "bcryptjs";

const { Client } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function seed() {
  await client.connect();
  console.log("Connected to database. Seeding...");

  // Clear existing data in dependency order
  await client.query(`
    DELETE FROM seo_reports;
    DELETE FROM digital_marketing_reports;
    DELETE FROM service_projects;
    DELETE FROM client_portals;
    DELETE FROM monthly_digital_completions;
    DELETE FROM monthly_digital_services;
    DELETE FROM monthly_website_completions;
    DELETE FROM monthly_website_services;
    DELETE FROM transactions;
    DELETE FROM expenses;
    DELETE FROM services;
    DELETE FROM customers;
  `);

  // ── Customers ────────────────────────────────────────────────────────────────
  const customersResult = await client.query(`
    INSERT INTO customers (name, phone, email, business_name, address, notes, contacted_at)
    VALUES
      ('Ahmed Al-Rashidi',   '+966501234567', 'ahmed@alrashidi.sa',   'Al-Rashidi Trading',    'Riyadh, KSA',       'Long-term client. Prefers WhatsApp.', NOW() - INTERVAL '90 days'),
      ('Sara Khalid',        '+966502345678', 'sara@khalidgroup.com', 'Khalid Group',          'Jeddah, KSA',       'Interested in SEO and social media.',  NOW() - INTERVAL '60 days'),
      ('Mohammed Al-Otaibi', '+966503456789', 'mo@alotaibi.sa',       'Al-Otaibi Contracting', 'Dammam, KSA',       'Website revamp requested.',            NOW() - INTERVAL '45 days'),
      ('Layla Hassan',       '+966504567890', 'layla@hassanfood.com', 'Hassan Food Co.',       'Riyadh, KSA',       'New client. Met at expo.',             NOW() - INTERVAL '30 days'),
      ('Tariq Nasser',       '+966505678901', 'tariq@nasserclinic.sa','Nasser Medical Clinic', 'Khobar, KSA',       'Needs patient portal integration.',    NOW() - INTERVAL '15 days')
    RETURNING id;
  `);
  const customerIds = customersResult.rows.map((r: { id: number }) => r.id);
  const [c1, c2, c3, c4, c5] = customerIds;
  console.log("Customers seeded:", customerIds);

  // ── Services (one-time) ──────────────────────────────────────────────────────
  await client.query(`
    INSERT INTO services (customer_id, service_type, billing_type, service_name, price_sold, cost_price, amount_paid, payment_status, delivery_status, satisfaction_rating, date, notes)
    VALUES
      (${c1}, 'website',        'one_time', 'Corporate Website Build',       '4500.00', '800.00',  '4500.00', 'paid',          'delivered', 5, '2025-02-10', 'Delivered on time. Client loved it.'),
      (${c2}, 'seo',            'one_time', 'SEO Audit & Setup',             '1200.00', '200.00',  '1200.00', 'paid',          'delivered', 4, '2025-03-05', 'Full audit + on-page fixes.'),
      (${c3}, 'website',        'one_time', 'Landing Page Design',           '2000.00', '350.00',  '1000.00', 'partial',       'in_progress', NULL, '2025-04-01', 'Half payment received. In progress.'),
      (${c4}, 'digital_marketing','one_time','Brand Identity Package',       '3000.00', '500.00',  '0.00',    'pending',       'pending',   NULL, '2025-04-20', 'Logo, colors, style guide.'),
      (${c5}, 'website',        'one_time', 'Clinic Booking System',         '6000.00', '1200.00', '6000.00', 'paid',          'delivered', 5, '2025-01-15', 'Integrated with their existing CRM.'),
      (${c1}, 'digital_marketing','one_time','Social Media Campaign Q1',     '1500.00', '300.00',  '1500.00', 'paid',          'delivered', 4, '2025-01-20', 'Great engagement results.'),
      (${c2}, 'website',        'one_time', 'E-commerce Store Setup',        '5500.00', '900.00',  '2750.00', 'partial',       'in_progress', NULL, '2025-05-01', '50% upfront paid.');
  `);
  console.log("Services seeded.");

  // ── Expenses ─────────────────────────────────────────────────────────────────
  await client.query(`
    INSERT INTO expenses (category, amount, date, notes)
    VALUES
      ('software', '299.00',  '2025-01-05', 'Adobe CC annual plan'),
      ('office',   '2000.00', '2025-01-01', 'Monthly office rent - Jan'),
      ('salary',   '800.00',  '2025-01-15', 'Designer for Al-Rashidi project'),
      ('ads',      '450.00',  '2025-02-10', 'Meta Ads for client campaigns'),
      ('office',   '2000.00', '2025-02-01', 'Monthly office rent - Feb'),
      ('software', '49.00',   '2025-02-20', 'Figma team plan'),
      ('tools',    '1200.00', '2025-03-08', 'New monitor and keyboard'),
      ('office',   '2000.00', '2025-03-01', 'Monthly office rent - Mar'),
      ('salary',   '600.00',  '2025-03-22', 'Developer for booking system'),
      ('misc',     '180.00',  '2025-04-05', 'Internet + electricity'),
      ('office',   '2000.00', '2025-04-01', 'Monthly office rent - Apr'),
      ('marketing','350.00',  '2025-04-18', 'Business cards and brochures'),
      ('office',   '2000.00', '2025-05-01', 'Monthly office rent - May'),
      ('hosting',  '99.00',   '2025-05-03', 'Hosting renewals');
  `);
  console.log("Expenses seeded.");

  // ── Transactions ─────────────────────────────────────────────────────────────
  await client.query(`
    INSERT INTO transactions (type, amount, source, account_name, method, date, notes)
    VALUES
      ('income',  '4500.00', 'Al-Rashidi Trading',    'Business Bank Account', 'bank_transfer', '2025-02-12', 'Full payment for corporate website'),
      ('income',  '1200.00', 'Khalid Group',          'Business Bank Account', 'bank_transfer', '2025-03-06', 'SEO audit payment'),
      ('expense', '800.00',  'Freelancer - Ahmad',    'Business Bank Account', 'bank_transfer', '2025-01-15', 'Designer payment'),
      ('income',  '1000.00', 'Al-Otaibi Contracting', 'Business Bank Account', 'bank_transfer', '2025-04-03', '50% upfront - landing page'),
      ('expense', '2000.00', 'Office Landlord',       'Business Bank Account', 'bank_transfer', '2025-01-01', 'Jan rent'),
      ('income',  '6000.00', 'Nasser Medical Clinic', 'Business Bank Account', 'bank_transfer', '2025-01-16', 'Full payment - booking system'),
      ('income',  '1500.00', 'Al-Rashidi Trading',    'Business Bank Account', 'bank_transfer', '2025-01-22', 'Social media campaign payment'),
      ('expense', '299.00',  'Adobe',                 'Business Bank Account', 'card',          '2025-01-05', 'Adobe CC subscription'),
      ('income',  '450.00',  'Monthly Retainer - C1', 'Business Bank Account', 'bank_transfer', '2025-03-01', 'Website maintenance - March'),
      ('expense', '450.00',  'Meta Ads',              'Business Bank Account', 'card',          '2025-02-10', 'Ads budget'),
      ('income',  '2750.00', 'Khalid Group',          'Business Bank Account', 'bank_transfer', '2025-05-02', '50% upfront - e-commerce'),
      ('expense', '2000.00', 'Office Landlord',       'Business Bank Account', 'bank_transfer', '2025-05-01', 'May rent');
  `);
  console.log("Transactions seeded.");

  // ── Monthly Website Services ──────────────────────────────────────────────────
  const mwsResult = await client.query(`
    INSERT INTO monthly_website_services (customer_id, website_name, monthly_cost, monthly_charge, discount, start_date, status, notes)
    VALUES
      (${c1}, 'alrashidi.sa',      '150.00', '500.00', '0.00',  '2024-06-01', 'active', 'Full maintenance + hosting'),
      (${c5}, 'nasserclinic.sa',   '200.00', '600.00', '50.00', '2025-01-01', 'active', 'Monthly updates + backups'),
      (${c2}, 'khalidgroup.com',   '100.00', '350.00', '0.00',  '2025-02-01', 'active', 'Basic maintenance package'),
      (${c3}, 'alotaibi-con.sa',   '80.00',  '250.00', '0.00',  '2024-09-01', 'paused', 'Paused - client requested break')
    RETURNING id;
  `);
  const mwsIds = mwsResult.rows.map((r: { id: number }) => r.id);
  const [mws1, mws2, mws3, mws4] = mwsIds;

  // ── Monthly Website Completions ───────────────────────────────────────────────
  await client.query(`
    INSERT INTO monthly_website_completions (service_id, year, month, completed, paid_amount, notes, completed_at)
    VALUES
      (${mws1}, 2025, 1, true,  '500.00', 'Completed on time', NOW() - INTERVAL '120 days'),
      (${mws1}, 2025, 2, true,  '500.00', 'Minor updates applied', NOW() - INTERVAL '90 days'),
      (${mws1}, 2025, 3, true,  '500.00', 'Plugin updates', NOW() - INTERVAL '60 days'),
      (${mws1}, 2025, 4, true,  '500.00', 'Content refresh', NOW() - INTERVAL '30 days'),
      (${mws1}, 2025, 5, false, '0.00',   NULL, NULL),
      (${mws2}, 2025, 1, true,  '550.00', 'Full month completed', NOW() - INTERVAL '120 days'),
      (${mws2}, 2025, 2, true,  '550.00', 'Added new staff page', NOW() - INTERVAL '90 days'),
      (${mws2}, 2025, 3, true,  '550.00', 'Security patches', NOW() - INTERVAL '60 days'),
      (${mws2}, 2025, 4, true,  '600.00', 'Blog section added', NOW() - INTERVAL '30 days'),
      (${mws2}, 2025, 5, false, '0.00',   NULL, NULL),
      (${mws3}, 2025, 2, true,  '350.00', 'First month', NOW() - INTERVAL '90 days'),
      (${mws3}, 2025, 3, true,  '350.00', 'Content update', NOW() - INTERVAL '60 days'),
      (${mws3}, 2025, 4, true,  '350.00', 'SEO adjustments', NOW() - INTERVAL '30 days'),
      (${mws3}, 2025, 5, false, '0.00',   NULL, NULL),
      (${mws4}, 2024, 9,  true,  '250.00', 'Active',  NOW() - INTERVAL '240 days'),
      (${mws4}, 2024, 10, true,  '250.00', 'Active',  NOW() - INTERVAL '210 days'),
      (${mws4}, 2024, 11, false, '0.00',   'Paused',  NULL);
  `);
  console.log("Monthly website services & completions seeded.");

  // ── Monthly Digital Services ──────────────────────────────────────────────────
  const mdsResult = await client.query(`
    INSERT INTO monthly_digital_services (customer_id, service_name, platform, monthly_cost, monthly_charge, discount, start_date, status, notes)
    VALUES
      (${c1}, 'Social Media Management', 'Instagram, Facebook', '200.00', '800.00',  '0.00',   '2024-08-01', 'active', '3 posts/week + stories'),
      (${c2}, 'SEO Monthly Retainer',    'Google',              '150.00', '600.00',  '0.00',   '2025-03-01', 'active', 'On-page + backlinks'),
      (${c4}, 'Social Media Management', 'TikTok, Instagram',   '250.00', '900.00',  '100.00', '2025-04-01', 'active', '5 reels/week'),
      (${c5}, 'Google Ads Management',   'Google',              '100.00', '500.00',  '0.00',   '2025-01-01', 'active', 'Search + display campaigns')
    RETURNING id;
  `);
  const mdsIds = mdsResult.rows.map((r: { id: number }) => r.id);
  const [mds1, mds2, mds3, mds4] = mdsIds;

  // ── Monthly Digital Completions ───────────────────────────────────────────────
  await client.query(`
    INSERT INTO monthly_digital_completions (service_id, year, month, completed, paid_amount, notes, completed_at)
    VALUES
      (${mds1}, 2024, 8,  true,  '800.00', 'Launched profiles', NOW() - INTERVAL '270 days'),
      (${mds1}, 2024, 9,  true,  '800.00', 'Ramadan content done', NOW() - INTERVAL '240 days'),
      (${mds1}, 2025, 1,  true,  '800.00', 'Good engagement month', NOW() - INTERVAL '120 days'),
      (${mds1}, 2025, 2,  true,  '800.00', 'Valentine campaign', NOW() - INTERVAL '90 days'),
      (${mds1}, 2025, 3,  true,  '800.00', 'Ramadan content', NOW() - INTERVAL '60 days'),
      (${mds1}, 2025, 4,  true,  '800.00', 'Eid campaign', NOW() - INTERVAL '30 days'),
      (${mds1}, 2025, 5,  false, '0.00',   NULL, NULL),
      (${mds2}, 2025, 3,  true,  '600.00', 'Audit + fixes month 1', NOW() - INTERVAL '60 days'),
      (${mds2}, 2025, 4,  true,  '600.00', 'Backlink building', NOW() - INTERVAL '30 days'),
      (${mds2}, 2025, 5,  false, '0.00',   NULL, NULL),
      (${mds3}, 2025, 4,  true,  '800.00', 'Launch month - great reach', NOW() - INTERVAL '30 days'),
      (${mds3}, 2025, 5,  false, '0.00',   NULL, NULL),
      (${mds4}, 2025, 1,  true,  '500.00', 'Campaign setup', NOW() - INTERVAL '120 days'),
      (${mds4}, 2025, 2,  true,  '500.00', 'Optimization round 1', NOW() - INTERVAL '90 days'),
      (${mds4}, 2025, 3,  true,  '500.00', 'Best CTR month so far', NOW() - INTERVAL '60 days'),
      (${mds4}, 2025, 4,  true,  '500.00', 'Steady leads', NOW() - INTERVAL '30 days'),
      (${mds4}, 2025, 5,  false, '0.00',   NULL, NULL);
  `);
  console.log("Monthly digital services & completions seeded.");

  // ── Service Projects ──────────────────────────────────────────────────────────
  await client.query(`
    INSERT INTO service_projects (customer_id, project_type, project_name, stage, progress, completed_notes, pending_notes, live_url, expected_delivery)
    VALUES
      (${c3}, 'website', 'Al-Otaibi Landing Page',    'design',      40, 'Wireframes approved. Design mockup in review.', 'Final design approval, development, launch.', NULL, '2025-06-15'),
      (${c4}, 'website', 'Hassan Food Brand Website',  'planning',    10, 'Discovery call done. Brand assets collected.', 'Sitemap, wireframes, design, dev, launch.', NULL, '2025-07-01'),
      (${c1}, 'website', 'Al-Rashidi Portal Upgrade',  'development', 75, 'Design done. Backend API built.', 'Frontend integration and QA.', NULL, '2025-05-30'),
      (${c5}, 'website', 'Nasser Clinic Booking v2',   'completed',  100, 'All features delivered and tested.', NULL, 'https://nasserclinic.sa', '2025-01-14');
  `);
  console.log("Service projects seeded.");

  // ── Client Portals ────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("Test@1234", 10);
  await client.query(`
    INSERT INTO client_portals (customer_id, password_hash, is_active)
    VALUES
      (${c1}, '${passwordHash}', true),
      (${c5}, '${passwordHash}', true),
      (${c2}, '${passwordHash}', false);
  `);
  console.log("Client portals seeded. Password: Test@1234");

  // ── Digital Marketing Reports ─────────────────────────────────────────────────
  await client.query(`
    INSERT INTO digital_marketing_reports
      (customer_id, year, month, platforms, plan, target_videos, target_posts, target_reels, target_stories,
       uploaded_videos, uploaded_posts, uploaded_reels, uploaded_stories,
       followers_gained, engagement_growth, leads_generated, ad_spend, summary_notes)
    VALUES
      (${c1}, 2025, 3, 'Instagram, Facebook', 'Ramadan Campaign',
        0, 12, 8, 20,   0, 12, 8, 18,   320, '+18%', 14, '0.00',    'Excellent Ramadan engagement. Reached 45K accounts.'),
      (${c1}, 2025, 4, 'Instagram, Facebook', 'Eid Special',
        0, 10, 6, 16,   0, 10, 6, 16,   210, '+12%', 9,  '0.00',    'Eid promo did well. 3 direct client inquiries.'),
      (${c4}, 2025, 4, 'TikTok, Instagram', 'Launch Month',
        4, 8,  12, 10,   4, 8, 11, 10,   540, '+31%', 22, '500.00', 'Viral reel hit 80K views. Strong launch.'),
      (${c5}, 2025, 3, 'Google', 'Search + Display',
        0, 0,  0, 0,    0, 0, 0, 0,      0,   NULL,   18, '1200.00','18 qualified leads from search ads this month.'),
      (${c5}, 2025, 4, 'Google', 'Search + Display',
        0, 0,  0, 0,    0, 0, 0, 0,      0,   NULL,   15, '1200.00','Consistent lead flow. CPC down 8%.');
  `);
  console.log("Digital marketing reports seeded.");

  // ── SEO Reports ───────────────────────────────────────────────────────────────
  await client.query(`
    INSERT INTO seo_reports
      (customer_id, year, month, blogs_posted, keywords_ranked, traffic_growth, backlinks_added, seo_score, notes)
    VALUES
      (${c2}, 2025, 3, 4, 12, '+22%', 8,  64, 'Month 1: Foundation work done. 12 keywords on page 2.'),
      (${c2}, 2025, 4, 4, 19, '+35%', 10, 71, 'Month 2: 5 keywords moved to page 1. Traffic up significantly.'),
      (${c1}, 2025, 2, 2, 8,  '+10%', 5,  58, 'Basic on-page SEO applied to main service pages.'),
      (${c1}, 2025, 3, 3, 14, '+19%', 7,  63, 'Blog content driving new organic visitors.');
  `);
  console.log("SEO reports seeded.");

  await client.end();
  console.log("\nAll test data seeded successfully!");
  console.log("─────────────────────────────────────");
  console.log("Customers:                 5");
  console.log("Services (one-time):       7");
  console.log("Expenses:                  14");
  console.log("Transactions:              12");
  console.log("Monthly Website Services:  4  (+17 completions)");
  console.log("Monthly Digital Services:  4  (+17 completions)");
  console.log("Service Projects:          4");
  console.log("Client Portals:            3  (password: Test@1234)");
  console.log("Digital Marketing Reports: 5");
  console.log("SEO Reports:               4");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
