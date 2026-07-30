const API_ORIGIN = "https://hiddenfeeai-worker.mr-richardthomasg888.workers.dev";

export async function onRequestGet(context) {
  const auditId = String(context.params.auditId || "");
  if (!/^[0-9a-f-]{36}$/i.test(auditId)) return new Response("Invalid report ID", { status: 400 });

  const upstream = await fetch(`${API_ORIGIN}/api/analyze/${encodeURIComponent(auditId)}/pdf`, {
    headers: { Accept: "application/pdf" },
  });
  if (!upstream.ok) {
    const message = await upstream.text().catch(() => "The PDF could not be generated.");
    return new Response(message, { status: upstream.status, headers: { "Content-Type": upstream.headers.get("Content-Type") || "text/plain" } });
  }

  const headers = new Headers(upstream.headers);
  headers.set("Content-Type", "application/pdf");
  headers.set("Content-Disposition", `attachment; filename="hiddenfeeai-audit-${auditId.slice(0, 8)}.pdf"`);
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(upstream.body, { status: 200, headers });
}
