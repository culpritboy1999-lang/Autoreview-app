'use strict';
/**
 * Demo dataset — clearly fictional shops with synthetic Google-style reviews.
 * Used when the app runs without Google API credentials (Demo Mode) so every
 * part of the product — fetching, AI replies, approval flow, public perception —
 * is fully explorable end-to-end.
 */

const BUSINESSES = [
  {
    slug: 'cafe-aroma',
    name: 'Café Aroma', category: 'Coffee shop', address: 'Demo District V, Budapest',
    about: 'A cozy specialty coffee house in the heart of the city, roasting single-origin beans and baking pastries in-house every morning.',
    brand: {
      tone: 'warm', language: 'English', signature: '— Team Café Aroma ☕',
      about: 'Family-run specialty coffee house in Budapest since 2016. We roast our own single-origin beans and bake everything fresh in-house.',
      rules_do: 'Thank guests by name. Mention our house-made pastries or single-origin roasts when relevant. Invite guests back for a free filter refill on their next visit.',
      rules_dont: 'Never offer refunds or compensation. Never use slang. Do not mention prices.',
      emoji_policy: 'sparingly', reply_length: 'short',
    },
    reviews: [
      ['Márta K.', 5, 'Absolutely the best flat white in the district. The baristas remember my order every single morning — the cinnamon knot is dangerous.', 2],
      ['James O.’Connell', 5, 'Stumbled in from the rain and left two hours later. Gorgeous interior, the Guatemala pour-over was fruity and bright. Staff chatted us through the bean menu with zero pretension.', 4],
      ['Zsófia T.', 4, 'Lovely little café, the cardamom bun is worth the hype. Minus one star because it gets really cramped around 9am on weekdays — hard to find a seat.', 6],
      ['Daniel R.', 5, 'The house-roasted Ethiopia tastes like blueberry jam. Bought a bag of beans to take home. This place is my new office.', 8],
      ['Petra L.', 2, 'Waited 20 minutes for a simple cappuccino while staff chatted behind the counter. The cake was dry too. Expected much more from the reviews.', 9],
      ['András B.', 5, 'Cozy atmosphere, super friendly team and the best smelling café in Budapest — you can smell the roast from the corner. The lemon tart is a masterpiece.', 12],
      ['Elena V.', 4, 'Great specialty coffee and very cozy. Only complaint: they ran out of oat milk by noon on Saturday. Otherwise flawless.', 15],
      ['Tom H.', 5, 'The cinnamon knot alone deserves five stars. Friendly service, fair prices, lovely playlist.', 18],
      ['Réka N.', 1, 'Rude service today. My croissant was burnt and when I politely mentioned it the barista rolled her eyes. Won’t come back.', 21],
      ['Giulia M.', 5, 'A little gem near the Danube. Flat white perfection, warm vibe, and they gave our dog a bowl of water and a treat. Customer for life.', 24],
      ['Péter S.', 4, 'Solid specialty coffee, nice quiet corner table for working. Wi-Fi is a bit spotty upstairs but the espresso makes up for it.', 28],
      ['Anna W.', 5, 'Visited every morning of our Budapest trip. The baristas are artists — latte art, genuine smiles, and that lemon tart. We miss it already.', 31],
    ],
  },
  {
    slug: 'rustic-spoon',
    name: 'The Rustic Spoon', category: 'Restaurant', address: 'Demo District VII, Budapest',
    about: 'Farm-to-table comfort food, slow-braised classics and a candle-lit courtyard in the old Jewish quarter.',
    brand: {
      tone: 'professional', language: 'English', signature: '— The Rustic Spoon Team',
      about: 'Farm-to-table restaurant in District VII focused on slow food, local farms and a candle-lit courtyard. Our goulash is braised for eight hours.',
      rules_do: 'Always thank the guest for the detailed feedback. Reference the specific dish they mentioned. Invite guests to try the chef’s tasting menu next time.',
      rules_dont: 'Never blame the guest. Never copy-paste generic replies. No exclamation marks — more than one per reply.',
      emoji_policy: 'none', reply_length: 'medium',
    },
    reviews: [
      ['Sarah M.', 5, 'The 8-hour braised goulash is the best thing I ate in Budapest, hands down. Candle-lit courtyard is straight out of a movie. Service was attentive without hovering.', 3],
      ['László P.', 4, 'Wonderful farm-to-table menu. The smoked duck breast was perfect; the pavlova was slightly too sweet for my taste. Will return for the tasting menu.', 5],
      ['Emily C.', 5, 'Booked for our anniversary — they remembered and had a candle on dessert. Beef tartare and the sour-cherry strudel were outstanding.', 7],
      ['Gergő F.', 2, 'Main course arrived cold and we waited 45 minutes despite the restaurant being half empty. The waiter apologised but nothing was offered. Disappointing for this price range.', 10],
      ['Nora J.', 5, 'Every dish tasted like someone’s grandmother was in the kitchen. The courtyard at sunset is magic. Reserve ahead — it fills up!', 13],
      ['Mateo G.', 4, 'Great seasonal menu, lovely wine list with local producers. The duck fat potatoes deserve their own fan club. Bread could be warmer.', 16],
      ['Klára D.', 3, 'Food was tasty (the venison especially) but we felt rushed — plates were cleared while we were still chewing. Ambience is lovely though.', 19],
      ['Henrik S.', 5, 'Chef’s tasting menu with wine pairing: six courses of pure comfort. The staff explained every farm each ingredient came from. Worth every forint.', 23],
      ['Isabel R.', 1, 'Sat down, waited 15 minutes, nobody brought a menu or water. Left without eating. Staff were too busy on their phones.', 26],
      ['Tamas K.', 5, 'The goulash lived up to the hype. Portions are generous, prices honest. The sour-cherry strudel is a religious experience.', 30],
      ['Laura B.', 4, 'Beautiful food and setting. One of our party is coeliac and the kitchen handled it perfectly with clear labelling. Slight wait for the main courses.', 33],
    ],
  },
  {
    slug: 'golden-crust',
    name: 'Golden Crust Bakery', category: 'Bakery', address: 'Demo District VI, Budapest',
    about: 'Neighbourhood sourdough bakery & laminates studio — croissants that shatter, loaves still warm at 7am.',
    brand: {
      tone: 'playful', language: 'English', signature: '— Your friends at Golden Crust 🥐',
      about: 'Small-batch sourdough bakery. Everything is mixed by hand, fermented overnight and out of the oven by 7am. Famous for our 48-hour croissants.',
      rules_do: 'Be cheerful and a little playful. Mention what time fresh batches come out of the oven (7am loaves, 9am croissants). Invite people to try the rye sourdough.',
      rules_dont: 'Never be defensive about sell-outs — thank people for wanting more. No corporate jargon.',
      emoji_policy: 'freely', reply_length: 'short',
    },
    reviews: [
      ['Kriszta V.', 5, 'The 48-hour croissants genuinely shatter when you bite them. I queue at 9am sharp like it’s a concert. Worth it every single time.', 2],
      ['Ben A.', 5, 'Best sourdough outside San Francisco. The crust sings when it comes out of the bag. Staff gave my daughter a mini baguette — she was delighted.', 4],
      ['Szilvi H.', 4, 'Everything is delicious, especially the walnut-honey loaf. Only note: by 11am most things are sold out, so go early!', 6],
      ['Marc D.', 5, 'Buttery, flaky, perfect. The bakers literally wave at you from the kitchen. This place has soul.', 9],
      ['Orsolya E.', 3, 'Croissants are amazing, but twice now the card terminal was “not working” — cash only apparently. Sign on the door would help.', 11],
      ['Freya N.', 5, 'Came for the croissants, stayed for the seeded rye. The smell alone at 7am is worth the trip across the city.', 14],
      ['Zoltán Gy.', 2, 'Sold out of everything except one sad slice of rye at 10:30 on a Sunday. If you close at noon, bake more or update your hours online.', 17],
      ['Amelia T.', 5, 'Little oven-fresh miracles every morning. The almond croissant is an event. Staff remember faces and orders — community feel.', 21],
      ['Dóra M.', 4, 'Gorgeous bread and pastries, fair prices. Queues on weekends move fast but there’s basically nowhere to stand inside.', 25],
      ['Lukas W.', 5, 'The rye sourdough keeps for a week and toasts like a dream. These people take fermentation seriously and it shows.', 29],
    ],
  },
  {
    slug: 'urban-verde',
    name: 'Urban Verde', category: 'Vegan bistro', address: 'Demo District IX, Budapest',
    about: 'Plant-based bistro doing zero-waste cooking, colourful bowls and legendary cashew burrata.',
    brand: {
      tone: 'friendly', language: 'English', signature: '— Urban Verde 🌱',
      about: 'Zero-waste vegan bistro. Everything plant-based, much of it from Budapest community gardens. Our cashew burrata is legendary — try it with the beet tartare.',
      rules_do: 'Celebrate guests trying plant-based food for the first time. Mention our zero-waste mission naturally. Suggest a specific dish for their next visit.',
      rules_dont: 'Never lecture anyone about veganism. Never guilt-trip meat eaters. Keep it food-first.',
      emoji_policy: 'sparingly', reply_length: 'medium',
    },
    reviews: [
      ['Hanna Ö.', 5, 'I’m not vegan and I didn’t miss meat once. The cashew burrata with beet tartare is genuinely one of the best dishes I’ve had this year.', 3],
      ['Chris P.', 4, 'Colourful bowls, super fresh, lovely terrace. The mushroom “pulled pork” bun is smoky and great. A couple of dishes were slightly under-seasoned.', 6],
      ['Vanda R.', 5, 'Zero-waste and delicious — they even bring your leftovers home in compostable boxes. The green curry bowl is comfort in a dish.', 9],
      ['Stefan L.', 5, 'As a carnivore I came kicking and screaming, left planning my next visit. Burrata 10/10. Staff are lovely and never preachy.', 12],
      ['Bogi F.', 2, 'Portions got much smaller while prices went up. Left hungry after a 4000 Ft bowl. The food is good but the value is gone.', 15],
      ['Julia S.', 4, 'Great plant-based spot. Dessert (the tahini brownie) was a bit dry, but the main courses more than made up for it.', 18],
      ['Nándor J.', 5, 'The weekly changing menu keeps it exciting. Beet tartare is a must. Love that they publish how much food waste they saved each month.', 22],
      ['Mia K.', 3, 'Nice food, but they got both our orders wrong and it took ages to flag someone down. The smoothie specials are overpriced.', 26],
      ['Alex G.', 5, 'Best vegan brunch in Budapest, full stop. Cashew burrata deserves its own museum. Dog-friendly terrace too.', 30],
    ],
  },
  {
    slug: 'danube-bites',
    name: 'Danube Bites', category: 'Street food', address: 'Demo Riverside Market, Budapest',
    about: 'Lángos, smoked sausage and chimney cake from a Riverside market stall — late-night legend.',
    brand: {
      tone: 'quirky', language: 'English', signature: '— Danube Bites crew 🧡',
      about: 'Street food stall at the riverside market. Crispy lángos, smoked sausage from a Mangalica farm and chimney cake grilled to order until midnight.',
      rules_do: 'Keep it casual and fun, like talking to a friend at the counter. Use Hungarian food names (lángos, kürtőskalács). Tease gently about the garlic sauce being “legendary”.',
      rules_dont: 'No formal language. Never promise shorter queues. Two emojis max.',
      emoji_policy: 'freely', reply_length: 'short',
    },
    reviews: [
      ['Tobias F.', 5, 'The garlic lángos at midnight is an institution. Crispy, garlicky, dangerous. Queue moves fast even when it looks long.', 2],
      ['Rebeka A.', 4, 'Chimney cake grilled to order is warm, smoky perfection. Only downside: the stall is hard to find if you don’t know the market. Follow the smell!', 5],
      ['Kevin B.', 5, 'Mangalica sausage with mustard on a paper tray, feet dangling over the Danube. Best €4 of my life.', 8],
      ['Ildikó Sz.', 3, 'Lángos was great but we waited 25 minutes on a Friday night. They need a second fryer, seriously.', 11],
      ['Hugo L.', 5, 'Tourist trap? Zero. This is where the locals eat. Garlic sauce is indeed legendary — my breath could power a tram.', 14],
      ['Nina P.', 2, 'Ran out of chimney cake at 9pm on a Saturday and the guy shrugged like it was our fault. Lángos was soggy in the middle too.', 17],
      ['Owen R.', 5, 'Crispy lángos, smoky sausage, cold beer, river view, fairy lights. What else do you want from a street food stall?', 20],
      ['Eszter L.', 4, 'Solid street food with real character. The vegetarian lángos with sheep cheese is the sleeper hit. Cash is king here — bring some.', 24],
      ['Máté V.', 5, 'Been coming since they opened. The crew remembers your usual order. The kürtőskalács with walnut is unbeatable.', 27],
      ['Grace W.', 5, 'We came three nights in a row on holiday. The staff started laughing when they saw us. Garlic lángos forever.', 31],
    ],
  },
];

module.exports = { BUSINESSES };
