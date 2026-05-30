require('dotenv/config');

const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../dist/generated/prisma/client');

const image = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

const youtube = (id) => `https://www.youtube.com/embed/${id}`;

const seedGames = [
  {
    title: '2026 여자 아이돌 이상형 월드컵',
    description: '요즘 많이 언급되는 여자 아이돌 후보를 모은 128강',
    thumbnail: youtube('D8VEhcPeSlc'),
    play_count: 18420,
    items: [
      { name: '카리나', image_url: youtube('D8VEhcPeSlc') },
      { name: '장원영', image_url: youtube('6ZUIwj3FgUY') },
      { name: '설윤', image_url: youtube('3GWscde8rM8') },
      { name: '해린', image_url: youtube('sVTy_wmn5SU') },
      { name: '민지', image_url: youtube('11cta61wi0g') },
      { name: '윈터', image_url: youtube('D8VEhcPeSlc') },
      { name: '하니', image_url: youtube('ArmDp-zijuc') },
      { name: '사쿠라', image_url: youtube('pyf8cbqyfPs') },
    ],
  },
  {
    title: '최애 음식 이상형 월드컵',
    description: '친구들이랑 고르면 은근히 싸움 나는 음식 취향 테스트',
    thumbnail: image('photo-1543353071-10c8ba85a904'),
    play_count: 9210,
    items: [
      { name: '떡볶이', image_url: image('photo-1569718212165-3a8278d5f624') },
      { name: '치킨', image_url: image('photo-1562967914-608f82629710') },
      { name: '초밥', image_url: image('photo-1579871494447-9811cf80d66c') },
      { name: '마라탕', image_url: image('photo-1569718212165-3a8278d5f624') },
      { name: '피자', image_url: image('photo-1565299624946-b28f40a0ae38') },
      { name: '라멘', image_url: image('photo-1569718212165-3a8278d5f624') },
      { name: '햄버거', image_url: image('photo-1568901346375-23c9450c58cd') },
      { name: '파스타', image_url: image('photo-1473093295043-cdd812d0e601') },
    ],
  },
  {
    title: '여행지 월드컵',
    description: '다음 휴가 후보를 같이 고르는 여행 취향 월드컵',
    thumbnail: image('photo-1507525428034-b723cf961d3e'),
    play_count: 6410,
    items: [
      { name: '삿포로', image_url: image('photo-1513415277900-a62401e19be4') },
      { name: '다낭', image_url: image('photo-1507525428034-b723cf961d3e') },
      { name: '파리', image_url: image('photo-1502602898657-3e91760cbb34') },
      { name: '제주', image_url: image('photo-1500530855697-b586d89ba3ee') },
      { name: '뉴욕', image_url: image('photo-1485871981521-5b1fd3805eee') },
      { name: '방콕', image_url: image('photo-1508009603885-50cf7c579365') },
      { name: '로마', image_url: image('photo-1529260830199-42c24126f198') },
      { name: '발리', image_url: image('photo-1537996194471-e657df975ab4') },
    ],
  },
  {
    title: '애니 캐릭터 이상형 월드컵',
    description: '긴 설명 없이 바로 고르는 인기 애니 캐릭터 256강',
    thumbnail: youtube('h3YKB_XWcb4'),
    play_count: 12844,
    items: [
      { name: '마린', image_url: youtube('h3YKB_XWcb4') },
      { name: '카오루코', image_url: youtube('h3YKB_XWcb4') },
      { name: '아냐', image_url: youtube('ofXigq9aIpo') },
      { name: '미쿠', image_url: youtube('jhl5afLEKdo') },
      { name: '치카', image_url: youtube('MCb13lbVGE0') },
      { name: '렘', image_url: youtube('Slz_rahWp6Y') },
      { name: '네즈코', image_url: youtube('VQGCKyvzIM4') },
      { name: '나미', image_url: youtube('MCb13lbVGE0') },
    ],
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required.');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const creator = await prisma.user.upsert({
      where: {
        provider_provider_id: {
          provider: 'seed',
          provider_id: 'worldcup-online',
        },
      },
      update: {
        nickname: '월드컵 seed',
      },
      create: {
        provider: 'seed',
        provider_id: 'worldcup-online',
        nickname: '월드컵 seed',
      },
    });

    for (const game of seedGames) {
      const existingGame = await prisma.worldcupGame.findFirst({
        where: { title: game.title },
      });

      const worldcupGame =
        existingGame ??
        (await prisma.worldcupGame.create({
          data: {
            title: game.title,
            description: game.description,
            thumbnail: game.thumbnail,
            play_count: game.play_count,
            creator_id: creator.id,
          },
        }));

      if (existingGame) {
        await prisma.worldcupGame.update({
          where: { id: worldcupGame.id },
          data: {
            description: game.description,
            thumbnail: game.thumbnail,
            play_count: game.play_count,
          },
        });
      }

      for (const item of game.items) {
        const existingItem = await prisma.worldcupItem.findFirst({
          where: {
            game_id: worldcupGame.id,
            name: item.name,
          },
        });

        if (existingItem) {
          await prisma.worldcupItem.update({
            where: { id: existingItem.id },
            data: { image_url: item.image_url },
          });
          continue;
        }

        await prisma.worldcupItem.create({
          data: {
            game_id: worldcupGame.id,
            name: item.name,
            image_url: item.image_url,
          },
        });
      }

      console.log(`seeded: ${game.title}`);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
