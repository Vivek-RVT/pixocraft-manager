import pg from "pg";
const { Client } = pg;

const c = new Client({ connectionString: process.env.DATABASE_URL });

c.connect()
  .then(() => c.query(`UPDATE services SET service_type = 'web' WHERE service_type = 'website'`))
  .then(() => c.query(`UPDATE services SET service_type = 'digital' WHERE service_type = 'digital_marketing'`))
  .then(() => { console.log("serviceType values fixed."); return c.end(); })
  .catch((e) => { console.error(e); c.end(); });
