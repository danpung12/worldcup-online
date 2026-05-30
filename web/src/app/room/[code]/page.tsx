import WorldcupApp from "../../worldcup-app";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return <WorldcupApp initialRoomCode={code} />;
}
