fetch("http://localhost:3000/api/queue", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ doctorId: "d-demo", patientId: "p-demo" })
}).then(res => console.log("POST /api/queue status:", res.status));

fetch("http://localhost:3000/api/messages?doctorId=d-demo&patientId=p-demo")
  .then(res => console.log("GET /api/messages status:", res.status));

fetch("http://localhost:3000/api/queue?doctorId=d-demo&patientId=p-demo")
  .then(res => console.log("GET /api/queue status:", res.status));
