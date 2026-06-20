// GET /api/agent/mdm/attestation-chain?serial=...
//
// Coordinator step 3 of guided MDM enrollment. Returns the captured
// Apple x5c attestation chain for a device (keyed by serial) as JSON
// {chain: string[] | null, status, ...}. The chain is captured by
// step-ca during the ACME device-attest-01 challenge; this endpoint
// reads it back so the SDK/console can staple it onto the provider's
// attestation record (att.mdaCertChain) to earn `hardware-attested`.
//
// Auth: the agent's bearer API key — same surface as the other
// /api/agent/* routes.
//
// Chain capture out of step-ca is ops-gated: when
// COCORE_MDM_CHAIN_STORE_URL is unset, returns {chain:null,
// status:"pending", stubbed:true}. See src/lib/mdm-coordinator.server.ts.

import { createFileRoute } from "@tanstack/react-router";

import {
  authenticateAgent,
  fetchAttestationChain,
  isValidSerial,
  mdmJson,
} from "@/lib/mdm-coordinator.server.ts";

export const Route = createFileRoute("/api/agent/mdm/attestation-chain")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = authenticateAgent(request);
        if (!auth.ok) return auth.response;

        const serial = new URL(request.url).searchParams.get("serial");
        if (!isValidSerial(serial)) {
          return mdmJson({ error: "serial query param required (8–24 alphanumeric chars)" }, 400);
        }

        const result = await fetchAttestationChain(serial);
        const status = result.status === "error" ? 502 : 200;
        return mdmJson(result, status);
      },
    },
  },
});
