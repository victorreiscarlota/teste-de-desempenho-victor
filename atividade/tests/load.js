import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },   
    { duration: '2m', target: 50 },   
    { duration: '30s', target: 0 },   
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'http_req_failed': ['rate<0.01'],
  },
};

export default function () {
  const url = 'http://localhost:3000/checkout/simple';
  const payload = JSON.stringify({
    userId: 'load-test-user',
    items: [{ id: 'sku-1', qty: 1 }],
  });
  const params = { headers: { 'Content-Type': 'application/json' } };
  const res = http.post(url, payload, params);

  check(res, {
    'status is 201': (r) => r.status === 201,
  });

  sleep(1);
}