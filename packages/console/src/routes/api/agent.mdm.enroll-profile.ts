// POST /api/agent/mdm/enroll-profile
//
// Coordinator step 1 of guided MDM enrollment (Apple Managed Device
// Attestation, the "Secure Mode" upgrade). Body: {serial, udid}.
//
// Mints a per-device enrollment .mobileconfig templated to that serial:
// root + intermediate trust payloads, a device-identity payload, and an
// MDM payload with AccessRights=3 and SignMessage=true. Returns the
// (signed-or-unsigned) profile as application/x-apple-aspen-config so a
// Mac installs it directly.
//
// Auth: the agent's bearer API key — same surface as /api/agent/whoami,
// /api/agent/status, /api/agent/bug-report.
//
// CA signing + real per-device identity minting are ops-gated; see the
// TODO(ops) seams and REQUIRED ENV doc in
// src/lib/mdm-coordinator.server.ts. Today this returns a templated,
// structurally-complete profile (unsigned) when signing isn't wired.

import { createFileRoute } from "@tanstack/react-router";

import {
  authenticateAgent,
  buildEnrollmentProfile,
  isValidSerial,
  isValidUdid,
  mdmJson,
} from "@/lib/mdm-coordinator.server.ts";

export const Route = createFileRoute("/api/agent/mdm/enroll-profile")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = authenticateAgent(request);
        if (!auth.ok) return auth.response;

        let body: { serial?: unknown; udid?: unknown };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return mdmJson({ error: "body must be JSON" }, 400);
        }
        if (!isValidSerial(body.serial)) {
          return mdmJson({ error: "serial required (8–24 alphanumeric chars)" }, 400);
        }
        if (!isValidUdid(body.udid)) {
          return mdmJson({ error: "udid required (40-hex or UUID form)" }, 400);
        }

        const { profile, signed, enrollmentId } = buildEnrollmentProfile(body.serial, body.udid);

        return new Response(profile, {
          status: 200,
          headers: {
            "content-type": "application/x-apple-aspen-config; charset=utf-8",
            "content-disposition": `attachment; filename="cocore-enroll-${body.serial}.mobileconfig"`,
            "cache-control": "no-store",
            // Surface coordinator metadata in headers so the agent can
            // thread the enrollmentId into push-attestation without
            // parsing the binary profile, and tell signed from unsigned.
            "x-cocore-enrollment-id": enrollmentId,
            "x-cocore-profile-signed": String(signed),
          },
        });
      },
    },
  },
});
