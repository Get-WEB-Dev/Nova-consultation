const p1 = fetch("http://localhost:3000/api/queue", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ doctorId: "d-demo", patientId: "p-demo" })
}).then(async res => console.log("POST /api/queue:", res.status, await res.text()));

const p2 = fetch("http://localhost:3000/api/messages?doctorId=d-demo&patientId=p-demo")
  .then(async res => console.log("GET /api/messages:", res.status, await res.text()));

const p3 = fetch("http://localhost:3000/api/queue?doctorId=d-demo&patientId=p-demo")
  .then(async res => console.log("GET /api/queue:", res.status, await res.text()));

await Promise.all([p1, p2, p3]);
