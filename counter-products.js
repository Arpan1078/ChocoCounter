/* Counter catalog: add an image and one entry here. IDs must be unique and stable.
   `image` (the catalog photo) is required. An optional `topViewImage` field names a
   true top-down photo of the same chocolate; the top-down box visualization
   (counter-box.js) uses `topViewImage` when present and falls back to `image`
   otherwise. The catalog card and the selected-chocolate summary thumbnail
   always use `image`, never `topViewImage`.
   `category` drives the Counter catalog filter and must be one of "basic",
   "seasonal", or "cocoshots". Sourced from assets/csv/chocolates.csv (the
   verified classification export), matched to these existing entries by name/
   description since the CSV uses different ids; CSV type "cocoashot" maps to
   "cocoshots" here to match the filter's existing value. The CSV's own catch-all
   "other" row (id -1, no image) is intentionally not represented as a product. */
const COUNTER_PRODUCTS = [
  {
    "id": "amaretto",
    "name": "Amaretto",
    "image": "assets/chocolates/amaretto-almond-gourmet-chocolate_600x.webp",
    "topViewImage": "assets/chocolates-top/processed/amaretto.png",
    "backgroundColor": "#A94459",
    "active": true,
    "category": "basic"
  },
  {
    "id": "banana-foster",
    "name": "Banana Foster",
    "image": "assets/chocolates/banana-foster-dark-chocolate_600x.webp",
    "topViewImage": "assets/chocolates-top/processed/banana-foster.png",
    "backgroundColor": "#C7A448",
    "active": true,
    "category": "basic"
  },
  {
    "id": "bourbon-barrel-maple-cream",
    "name": "Bourbon Barrel Maple Cream",
    "image": "assets/chocolates/bourbon-barrel-maple-cream-chocolate_600x.webp",
    "topViewImage": "assets/chocolates-top/processed/bourbon-barrel-maple-cream.png",
    "backgroundColor": "#667989",
    "active": true,
    "category": "seasonal"
  },
  {
    "id": "brownie-batter",
    "name": "Brownie Batter",
    "image": "assets/chocolates/brownie-batter-dark-chocolate-truffle_600x.webp",
    "topViewImage": "assets/chocolates-top/processed/brownie-batter.png",
    "backgroundColor": "#736477",
    "active": true,
    "category": "basic"
  },
  {
    "id": "caramel-apple-cider",
    "name": "Caramel Apple Cider",
    "image": "assets/chocolates/caramel-apple-cider-gourmet-chocolate_600x.webp",
    "topViewImage": "assets/chocolates-top/processed/caramel-apple-cider.png",
    "backgroundColor": "#9DAB83",
    "active": true,
    "category": "seasonal"
  },
  {
    "id": "champagne",
    "name": "Champagne",
    "image": "assets/chocolates/champagne-sparkling-gourmet-chocolate_600x.webp",
    "topViewImage": "assets/chocolates-top/processed/champagne.png",
    "backgroundColor": "#C09D68",
    "active": true,
    "category": "basic"
  },
  {
    "id": "cheesecake",
    "name": "Cheesecake",
    "image": "assets/chocolates/cheesecake-white-chocolate-truffle_600x.webp",
    "backgroundColor": "#DCA88E",
    "active": true,
    "category": "basic"
  },
  {
    "id": "confetti-cake",
    "name": "Confetti Cake",
    "image": "assets/chocolates/confetti-cake-gold-chocolate-truffle_600x.webp",
    "topViewImage": "assets/chocolates-top/processed/confetti-cake.png",
    "backgroundColor": "#CE8E9F",
    "active": true,
    "category": "basic"
  },
  {
    "id": "cookies-cream",
    "name": "Cookies & Cream",
    "image": "assets/chocolates/cookies-and-cream-gourmet-chocolate_600x.webp",
    "topViewImage": "assets/chocolates-top/processed/cookies-cream.png",
    "backgroundColor": "#536D9A",
    "active": true,
    "category": "basic"
  },
  {
    "id": "creme-brulee",
    "name": "Crème Brûlée",
    "image": "assets/chocolates/creme-brulee-dessert-chocolate_600x.webp",
    "topViewImage": "assets/chocolates-top/processed/creme-brulee.png",
    "backgroundColor": "#CB864D",
    "active": true,
    "category": "basic"
  },
  {
    "id": "dulce-de-leche",
    "name": "Dulce de Leche",
    "image": "assets/chocolates/DulceDeLeche_600x.webp",
    "topViewImage": "assets/chocolates-top/processed/dulce-de-leche.png",
    "backgroundColor": "#C1A17F",
    "active": true,
    "category": "basic"
  },
  {
    /* Matched to the CSV's "Tea & Honey" (tea_honey) row by description
       ("Earl Grey tea and Hawaiian honey") -- the CSV renamed it, but this
       keeps the existing id/display name per "preserve existing product IDs
       wherever possible." Flag for confirmation if that match is wrong. */
    "id": "earl-grey-honey",
    "name": "Earl Grey Honey",
    "image": "assets/chocolates/earl-grey-honey-gourmet-chocolate_600x.webp",
    "topViewImage": "assets/chocolates-top/processed/earl-grey-honey.png",
    "backgroundColor": "#8498B5",
    "active": true,
    "category": "basic"
  },
  {
    "id": "espresso-martini",
    "name": "Espresso Martini",
    "image": "assets/chocolates/espresso-martini-coffee-chocolate_600x.webp",
    "topViewImage": "assets/chocolates-top/processed/espresso-martini.png",
    "backgroundColor": "#4B6770",
    "active": true,
    "category": "basic"
  },
  {
    "id": "grey-salt-caramel",
    "name": "French Grey Salt Caramel",
    "image": "assets/chocolates/french-grey-salt-caramel-chocolate_600x.webp",
    "topViewImage": "assets/chocolates-top/processed/grey-salt-caramel.png",
    "backgroundColor": "#758779",
    "active": true,
    "category": "basic"
  },
  {
    "id": "key-lime-pie",
    "name": "Key Lime Pie",
    "image": "assets/chocolates/key-lime-pie-white-chocolate_600x.webp",
    "topViewImage": "assets/chocolates-top/processed/key-lime-pie.png",
    "backgroundColor": "#A9B979",
    "active": true,
    "category": "basic"
  },
  {
    "id": "lemon",
    "name": "Lemon",
    "image": "assets/chocolates/lemon-citrus-white-chocolate_600x.webp",
    "topViewImage": "assets/chocolates-top/processed/lemon.png",
    "backgroundColor": "#C1A537",
    "active": true,
    "category": "basic"
  },
  {
    "id": "manhattan",
    "name": "Manhattan",
    "image": "assets/chocolates/manhattan-whiskey-chocolate_600x.webp",
    "topViewImage": "assets/chocolates-top/processed/manhattan.png",
    "backgroundColor": "#B86C53",
    "active": true,
    "category": "basic"
  },
  {
    "id": "pb-caramel",
    "name": "Peanut Butter Caramel",
    "image": "assets/chocolates/PeanutButterCaramel_600x.webp",
    "topViewImage": "assets/chocolates-top/processed/pb-caramel.png",
    "backgroundColor": "#B7876D",
    "active": true,
    "category": "basic"
  },
  {
    "id": "pineapple-moscato",
    "name": "Pineapple Moscato",
    "image": "assets/chocolates/pineapple-moscato-tropical-chocolate_600x.webp",
    "topViewImage": "assets/chocolates-top/processed/pineapple-moscato.png",
    "backgroundColor": "#568D91",
    "active": true,
    "category": "basic"
  },
  {
    "id": "pistachio",
    "name": "Pistachio",
    "image": "assets/chocolates/pistachio-nut-gourmet-chocolate_600x.webp",
    "topViewImage": "assets/chocolates-top/processed/pistachio.png",
    "backgroundColor": "#435674",
    "active": true,
    "category": "basic"
  },
  {
    "id": "pumpkin-spice-latte",
    "name": "Pumpkin Spice Latte",
    "image": "assets/chocolates/pumpkin-spice-latte-gourmet-chocolate._600x.webp",
    "topViewImage": "assets/chocolates-top/processed/pumpkin-spice-latte.png",
    "backgroundColor": "#B85B3D",
    "active": true,
    "category": "seasonal"
  },
  {
    "id": "raspberry",
    "name": "Raspberry",
    "image": "assets/chocolates/raspberry-dark-chocolate-truffle._600x.webp",
    "topViewImage": "assets/chocolates-top/processed/raspberry.png",
    "backgroundColor": "#AC4565",
    "active": true,
    "category": "basic"
  },
  {
    "id": "salted-caramel",
    "name": "Salted Caramel",
    "image": "assets/chocolates/salted-caramel-dark-milk-chocolate_600x.webp",
    "topViewImage": "assets/chocolates-top/processed/salted-caramel.png",
    "backgroundColor": "#C09554",
    "active": true,
    "category": "basic"
  },
  {
    "id": "smores",
    "name": "S’mores",
    "image": "assets/chocolates/smores-marshmallow-gourmet-chocolate_600x.webp",
    "topViewImage": "assets/chocolates-top/processed/smores.png",
    "backgroundColor": "#937A9F",
    "active": true,
    "category": "seasonal"
  },
  {
    "id": "turtle-pecan-caramel",
    "name": "Turtle Pecan Caramel",
    "image": "assets/chocolates/turtle-pecan-caramel-chocolate_600x.webp",
    "topViewImage": "assets/chocolates-top/processed/turtle-pecan-caramel.png",
    "backgroundColor": "#9C5F5B",
    "active": true,
    "category": "basic"
  },
  /* CocoShots (CSV type "cocoashot"): none of these existed in the catalog
     before, so they're added fresh from the CSV. No topViewImage exists yet
     for any of them -- the box visualization already falls back to `image`
     automatically when topViewImage is absent, exactly as it does for
     Cheesecake above. backgroundColor is a single neutral placeholder shared
     across all nine pending real design input; update per-item once supplied. */
  {
    "id": "shot-bourbon",
    "name": "Bourbon",
    "image": "assets/chocolates/shot_bourbon.png",
    "backgroundColor": "#7C6A5E",
    "active": true,
    "category": "cocoshots"
  },
  {
    "id": "shot-old-fashioned",
    "name": "Old Fashioned",
    "image": "assets/chocolates/shot_old_fashioned.png",
    "backgroundColor": "#7C6A5E",
    "active": true,
    "category": "cocoshots"
  },
  {
    "id": "shot-tequila",
    "name": "Tequila",
    "image": "assets/chocolates/shot_tequila.png",
    "backgroundColor": "#7C6A5E",
    "active": true,
    "category": "cocoshots"
  },
  {
    "id": "shot-whiskey",
    "name": "Whiskey",
    "image": "assets/chocolates/shot_whiskey.png",
    "backgroundColor": "#7C6A5E",
    "active": true,
    "category": "cocoshots"
  },
  {
    "id": "shot-amaretto",
    "name": "Amaretto Shot",
    "image": "assets/chocolates/shot_amaretto.png",
    "backgroundColor": "#7C6A5E",
    "active": true,
    "category": "cocoshots"
  },
  {
    "id": "shot-chocolate-cake",
    "name": "Chocolate Cake",
    "image": "assets/chocolates/shot_chocolate_cake.png",
    "backgroundColor": "#7C6A5E",
    "active": true,
    "category": "cocoshots"
  },
  /* Holiday-only per the CSV description; active:false there, so these stay
     out of the live Counter catalog but remain in the data for later reuse. */
  {
    "id": "shot-candy-cane-bark",
    "name": "Candy Cane Bark",
    "image": "assets/chocolates/shot_candy_cane_bark.png",
    "backgroundColor": "#7C6A5E",
    "active": false,
    "category": "cocoshots"
  },
  {
    "id": "shot-caramel-apple-pie",
    "name": "Caramel Apple Pie",
    "image": "assets/chocolates/shot_caramel_apple_pie.png",
    "backgroundColor": "#7C6A5E",
    "active": false,
    "category": "cocoshots"
  },
  {
    "id": "shot-snickerdoodle",
    "name": "Snickerdoodle",
    "image": "assets/chocolates/shot_snickerdoodle.png",
    "backgroundColor": "#7C6A5E",
    "active": false,
    "category": "cocoshots"
  }
];
