import WorldcupApp from "../../worldcup-app";

export default async function RankingPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const initialGameId = Number(gameId);

  return (
    <WorldcupApp
      initialGameId={Number.isFinite(initialGameId) ? initialGameId : undefined}
      initialView="ranking"
    />
  );
}
