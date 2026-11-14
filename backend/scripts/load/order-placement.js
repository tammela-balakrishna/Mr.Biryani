// k6 load test for the hot path: customers browsing the menu and placing orders.
// Run: k6 run -e BASE_URL=http://localhost:8080 -e BRANCH_ID=<uuid> -e ITEM_ID=<uuid> -e EMAIL=<customer> -e PASSWORD=<pw> scripts/load/order-placement.js
// Use a staging environment only. Do not point this at production without an agreed load window.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const BASE = __ENV.BASE_URL || 'http://localhost:8080';

export const options = {
  stages: [
    { duration: '1m', target: 20 },
    { duration: '3m', target: 20 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{name:place_order}': ['p(95)<800'],
    'http_req_duration{name:menu}': ['p(95)<300'],
  },
};

export function setup() {
  const res = http.post(`${BASE}/api/v1/auth/login`, JSON.stringify({ email: __ENV.EMAIL, password: __ENV.PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } });
  check(res, { 'login ok': (r) => r.status === 200 });
  return { token: res.json('data.accessToken') };
}

export default function (data) {
  const menu = http.get(`${BASE}/api/v1/menu`, { tags: { name: 'menu' } });
  check(menu, { 'menu ok': (r) => r.status === 200 });

  const body = JSON.stringify({ branchId: __ENV.BRANCH_ID, items: [{ menuItemId: __ENV.ITEM_ID, quantity: 1 }] });
  const res = http.post(`${BASE}/api/v1/orders`, body, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.token}`,
      // One key per virtual-user iteration, so every request creates a real order.
      'Idempotency-Key': uuidv4(),
    },
    tags: { name: 'place_order' },
  });
  check(res, { 'order placed': (r) => r.status === 201 });
  sleep(1);
}
