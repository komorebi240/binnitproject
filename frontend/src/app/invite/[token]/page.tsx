import { AuthPageShell } from "@/components/layout/AuthPageShell";
import { OrbitWordmark } from "@/components/brand/OrbitWordmark";
import { AcceptInvitationForm } from "@/features/onboarding/components/AcceptInvitationForm";

interface InvitePageProps {
  params: { token: string };
}

export default function InvitePage({ params }: InvitePageProps) {
  return (
    <AuthPageShell>
      <div className="flex flex-col items-center gap-3 text-center">
        <OrbitWordmark width={180} />
        <div>
          <h1 className="text-xl font-semibold text-fg">Lời mời tham gia</h1>
          <p className="text-sm text-fg-muted">Tạo tài khoản để bắt đầu làm việc cùng đội của bạn.</p>
        </div>
      </div>
      <AcceptInvitationForm token={params.token} />
    </AuthPageShell>
  );
}
