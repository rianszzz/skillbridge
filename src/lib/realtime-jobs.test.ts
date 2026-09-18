import test from "node:test";
import assert from "node:assert/strict";
import {
  JOB_SYNC_CHANNEL,
  broadcastJobSync,
  setupJobRealtimeSync,
  type JobSyncEvent,
} from "./realtime-jobs.ts";
import { DEMO_JOBS } from "./jobs.ts";

test("JOB_SYNC_CHANNEL memiliki identifier yang sesuai", () => {
  assert.equal(JOB_SYNC_CHANNEL, "skillbridge_jobs_channel");
});

test("broadcastJobSync dan BroadcastChannel mengirim dan menerima pesan sinkronisasi antar-tab", async () => {
  const sampleJob = DEMO_JOBS[0];
  let receivedEvent: JobSyncEvent | null = null;

  const bcReceiver = new BroadcastChannel(JOB_SYNC_CHANNEL);
  bcReceiver.onmessage = (event) => {
    receivedEvent = event.data as JobSyncEvent;
  };

  broadcastJobSync({ type: "JOB_UPDATED", job: sampleJob });

  // Beri jeda tick untuk pengiriman pesan antar-channel
  await new Promise((resolve) => setTimeout(resolve, 50));

  assert.ok(receivedEvent);
  assert.equal((receivedEvent as JobSyncEvent).type, "JOB_UPDATED");
  assert.equal((receivedEvent as { job: typeof sampleJob }).job.id, sampleJob.id);

  bcReceiver.close();
});

test("setupJobRealtimeSync mendispatch pesan BroadcastChannel ke handler spesifik", async () => {
  const sampleJob = DEMO_JOBS[1];
  let createdJobId = "";
  let updatedJobId = "";
  let deletedJobId = "";

  const unsubscribe = setupJobRealtimeSync({
    onJobCreated: (job) => {
      createdJobId = job.id;
    },
    onJobUpdated: (job) => {
      updatedJobId = job.id;
    },
    onJobDeleted: (id) => {
      deletedJobId = id;
    },
  });

  broadcastJobSync({ type: "JOB_CREATED", job: sampleJob });
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(createdJobId, sampleJob.id);

  broadcastJobSync({ type: "JOB_UPDATED", job: sampleJob });
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(updatedJobId, sampleJob.id);

  broadcastJobSync({ type: "JOB_DELETED", jobId: sampleJob.id });
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(deletedJobId, sampleJob.id);

  unsubscribe();
});
