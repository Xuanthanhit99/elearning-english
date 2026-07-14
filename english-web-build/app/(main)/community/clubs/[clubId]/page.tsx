import { CommunityClubDetailPage } from "@/src/Components/community-club/CommunityClubDetailPage";

export default async function ClubPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;

  return <CommunityClubDetailPage clubId={clubId} />;
}