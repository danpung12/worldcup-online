-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'kakao',
    "provider_id" TEXT NOT NULL,
    "email" TEXT,
    "nickname" TEXT NOT NULL,
    "profile_image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldcupGame" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "creator_id" INTEGER NOT NULL,
    "play_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldcupGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldcupItem" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "game_id" INTEGER NOT NULL,

    CONSTRAINT "WorldcupItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldcupRoom" (
    "id" SERIAL NOT NULL,
    "game_id" INTEGER NOT NULL,
    "room_code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldcupRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomMember" (
    "id" SERIAL NOT NULL,
    "nickname" TEXT NOT NULL,
    "is_host" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER,
    "room_id" INTEGER NOT NULL,

    CONSTRAINT "RoomMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldcupMatch" (
    "id" SERIAL NOT NULL,
    "item_a_id" INTEGER NOT NULL,
    "item_b_id" INTEGER NOT NULL,
    "winner_id" INTEGER,
    "round_id" INTEGER NOT NULL,
    "room_id" INTEGER NOT NULL,
    "match_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldcupMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldcupVote" (
    "id" SERIAL NOT NULL,
    "member_id" INTEGER NOT NULL,
    "match_id" INTEGER NOT NULL,
    "select_item_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "room_id" INTEGER NOT NULL,

    CONSTRAINT "WorldcupVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_provider_provider_id_key" ON "User"("provider", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "WorldcupRoom_room_code_key" ON "WorldcupRoom"("room_code");

-- CreateIndex
CREATE UNIQUE INDEX "RoomMember_room_id_user_id_key" ON "RoomMember"("room_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "WorldcupVote_member_id_match_id_key" ON "WorldcupVote"("member_id", "match_id");

-- AddForeignKey
ALTER TABLE "WorldcupGame" ADD CONSTRAINT "WorldcupGame_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldcupItem" ADD CONSTRAINT "WorldcupItem_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "WorldcupGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldcupRoom" ADD CONSTRAINT "WorldcupRoom_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "WorldcupGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMember" ADD CONSTRAINT "RoomMember_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMember" ADD CONSTRAINT "RoomMember_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "WorldcupRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldcupMatch" ADD CONSTRAINT "WorldcupMatch_item_a_id_fkey" FOREIGN KEY ("item_a_id") REFERENCES "WorldcupItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldcupMatch" ADD CONSTRAINT "WorldcupMatch_item_b_id_fkey" FOREIGN KEY ("item_b_id") REFERENCES "WorldcupItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldcupMatch" ADD CONSTRAINT "WorldcupMatch_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "WorldcupItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldcupMatch" ADD CONSTRAINT "WorldcupMatch_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "WorldcupRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldcupVote" ADD CONSTRAINT "WorldcupVote_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "RoomMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldcupVote" ADD CONSTRAINT "WorldcupVote_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "WorldcupMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldcupVote" ADD CONSTRAINT "WorldcupVote_select_item_id_fkey" FOREIGN KEY ("select_item_id") REFERENCES "WorldcupItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldcupVote" ADD CONSTRAINT "WorldcupVote_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "WorldcupRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
