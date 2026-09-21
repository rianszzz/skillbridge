import test from "node:test";
import assert from "node:assert/strict";
import {
  JOB_SYNC_CHANNEL,
  broadcastJobSync,
  setupJobRealtimeSync,
  type JobSyncEvent,
} from "./realtime-jobs.ts";
import { MOCK_JOBS_FIXTURE } from "./jobs.ts";

test("JOB_SYNC_CHANNEL memiliki identifier yang sesuai", () => {
  assert.equal(JOB_SYNC_CHANNEL, "skillbridge_jobs_channel");
});

test("broadcastJobSync dan BroadcastChannel mengirim dan menerima pesan sinkronisasi antar-tab", async () => {
  const sampleJob = MOCK_JOBS_FIXTURE[0];
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
  const sampleJob = MOCK_JOBS_FIXTURE[1] || MOCK_JOBS_FIXTURE[0];
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

test("setupJobRealtimeSync mendispatch APPLICATION_STATUS_UPDATED ke onApplicationStatusUpdated dan onRefresh", async () => {
  let updatedPayload: { applicationId: string; candidateId?: string; status: string } | null = null;
  let refreshCalled = false;

  const unsubscribe = setupJobRealtimeSync({
    onApplicationStatusUpdated: (payload) => {
      updatedPayload = payload;
    },
    onRefresh: () => {
      refreshCalled = true;
    },
  });

  broadcastJobSync({
    type: "APPLICATION_STATUS_UPDATED",
    applicationId: "app-123",
    candidateId: "user-456",
    status: "shortlisted",
  });

  await new Promise((resolve) => setTimeout(resolve, 50));

  assert.ok(updatedPayload !== null);
  const resPayload = updatedPayload as { applicationId: string; candidateId?: string; status: string };
  assert.equal(resPayload.applicationId, "app-123");
  assert.equal(resPayload.candidateId, "user-456");
  assert.equal(resPayload.status, "shortlisted");
  assert.equal(refreshCalled, true);

  unsubscribe();
});

test("Event APPLICATION_STATUS_UPDATED dapat dikirim dan diterima melalui broadcastJobSync", async () => {
  let receivedEvent: JobSyncEvent | null = null;

  const bcReceiver = new BroadcastChannel(JOB_SYNC_CHANNEL);
  bcReceiver.onmessage = (event) => {
    receivedEvent = event.data as JobSyncEvent;
  };

  broadcastJobSync({
    type: "APPLICATION_STATUS_UPDATED",
    applicationId: "app-sync-evt-001",
    candidateId: "candidate-sync-evt-001",
    status: "shortlisted",
  });

  await new Promise((resolve) => setTimeout(resolve, 50));

  assert.ok(receivedEvent !== null);
  const evt = receivedEvent as Extract<JobSyncEvent, { type: "APPLICATION_STATUS_UPDATED" }>;
  assert.equal(evt.type, "APPLICATION_STATUS_UPDATED");
  assert.equal(evt.applicationId, "app-sync-evt-001");
  assert.equal(evt.candidateId, "candidate-sync-evt-001");
  assert.equal(evt.status, "shortlisted");

  bcReceiver.close();
});


