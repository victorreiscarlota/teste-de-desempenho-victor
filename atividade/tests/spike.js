import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '10s', target: 300 },
    { duration: '60s', target: 300 },
    { duration: '1s', target: 10 },
  ],
  thresholds: {
    'http_req_failed': ['rate<0.05'],
  },
};

export default function () {
  const url = 'http://localhost:3000/checkout/simple';
  const payload = JSON.stringify({
    userId: 'spike-user',
    items: [{ id: 'sku-spike', qty: 1 }],
  });
  const params = { headers: { 'Content-Type': 'application/json' } };
  const res = http.post(url, payload, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(0.5);
}