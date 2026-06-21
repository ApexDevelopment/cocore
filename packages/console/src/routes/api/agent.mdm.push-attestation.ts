// POST /api/agent/mdm/push-attestation
//
// Coordinator step 2 of guided MDM enrollment. Body: {serial,
// enrollmentId}. Enqueues the ACME attestation profile (ClientIdentifier
// + Subject CN = serial) to NanoMDM via /v1/enqueue + /v1/push, using
// COCORE_NANOMDM_URL + COCORE_NANOMDM_API_KEY. Returns the command
// status.
//
// Auth: the agent's bearer API key — same surface as the other
// /api/agent/* routes.
//
// NanoMDM wiring is ops-gated: when the env isn't set the enqueue is
// stubbed (status "queued", stubbed:true) so the flow is exercisable in
// a backendless dev ring. See src/lib/mdm-coordinator.server.ts.

import { createFileRoute } from "@tanstack/react-router";

import {
  authenticateAgent,
  isValidSerial,
  mdmJson,
  pushAttestationCommand,
} from "@/lib/mdm-coordinator.server.ts";

export const Route = createFileRoute("/api/agent/mdm/push-attestation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = authenticateAgent(request);
        if (!auth.ok) return auth.response;

        let body: { serial?: unknown; enrollmentId?: unknown };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return mdmJson({ error: "body must be JSON" }, 400);
        }
        if (!isValidSerial(body.serial)) {
          return mdmJson({ error: "serial required (8–24 alphanumeric chars)" }, 400);
        }
        if (typeof body.enrollmentId !== "string" || body.enrollmentId.length === 0) {
          return mdmJson({ error: "enrollmentId required" }, 400);
        }

        const result = await pushAttestationCommand(body.serial, body.enrollmentId);
        const status = result.status === "error" ? 502 : 200;
        return mdmJson(result, status);
      },
    },
  },
});
