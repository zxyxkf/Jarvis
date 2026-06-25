// k6 performance test suite for Jarvis
// Usage: k6 run k6-load-test.js

import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 5 },   // ramp-up to 5 users
    { duration: '1m', target: 5 },    // steady 5 users
    { duration: '30s', target: 10 },  // ramp-up to 10 users
    { duration: '1m', target: 10 },   // steady 10 users
    { duration: '30s', target: 0 },   // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],  // 95% of requests < 3s
    http_req_failed: ['rate<0.1'],      // < 10% error rate
  },
}

const BASE_URL = 'http://localhost:3000/api/v1'

export default function () {
  // Health check
  const health = http.get(`${BASE_URL}/health`)
  check(health, { 'health ok': (r) => r.status === 200 })

  // Knowledge base list
  const kb = http.get(`${BASE_URL}/knowledge/bases`)
  check(kb, { 'kb list ok': (r) => r.status === 200 })

  // Search (light load)
  const search = http.get(`${BASE_URL}/knowledge/bases/demo/search?query=test`)
  check(search, { 'search ok': (r) => r.status === 200 || r.status === 404 })

  sleep(1)
}
