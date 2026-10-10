import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { applyInviteCode } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import { BRAND_NAME, SITE_URL, payoutClockLabel } from "@/lib/platform";
import { normalizeInviteCode } from "@/lib/invite";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const invite = normalizeInviteCode(code) || code.toUpperCase().slice(0, 10);
  const title = `Join ${BRAND_NAME} with code ${invite}`;
  const description =
    `Activate a QuantumMine AI trading product and collect its daily income at ${payoutClockLabel()}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/invite/${invite}`,
      siteName: BRAND_NAME,
      type: "website",
      images: [{ url: "/brand/open_graph.jpg", alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/brand/open_graph.jpg"],
    },
  };
}

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const invite = normalizeInviteCode(code);
  if (!invite) redirect("/register");

  // Signed-in members get linked and sent home. Everyone else skips the
  // landing page and opens registration with the code already filled in.
  let signedIn = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
    if (user) await applyInviteCode(invite);
  } catch {
    // A missing session still continues to registration.
  }

  redirect(signedIn ? "/" : `/register?ref=${encodeURIComponent(invite)}`);
}
