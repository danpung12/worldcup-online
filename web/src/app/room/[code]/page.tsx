import WorldcupApp from "../../worldcup-app";

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ fresh?: string }>;
}) {
  const { code } = await params;
  const { fresh } = await searchParams;

  return <WorldcupApp initialRoomCode={code} skipRoomRestore={fresh === "1"} />;
}
