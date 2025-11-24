import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 200 },  
    { duration: '2m', target: 500 },  
    { duration: '2m', target: 1000 }, 
  ],
  thresholds: {
    'http_req_failed': ['rate<1'],
  },
};

export default function () {
  const url = 'http://localhost:3000/checkout/crypto';
  const payload = JSON.stringify({
    userId: 'stress-user',
    payloadSize: 1024,
  });
  const params = { headers: { 'Content-Type': 'application/json' } };
  const res = http.post(url, payload, params);

  check(res, {
    'status is 201': (r) => r.status === 201,
  });

  sleep(0.2);
}