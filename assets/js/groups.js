/*
 * ==========================================================
 *  AGENT INUS - WALLET TRACKER  ::  GROUP CONFIG
 * ==========================================================
 *  Add a new group = copy one block below and edit it.
 *
 *  id      : unique, lowercase, letters/numbers/dashes (used for cache keys)
 *  name    : title shown on the card
 *  sprite  : pixel character for the card. One of:
 *            "inu", "dragon", "panda", "cat", "frog", "goblin", "robot", "ghost",
 *            "hedgehog", "octopus", "horse", "capybara"
 *  chains  : chains to scan for every wallet in the group. Supported:
 *            "worldchain", "ethereum", "base", "arbitrum", "optimism"
 *            (all served by free public Blockscout explorers - see CHAINS in app.js)
 *  wallets : list of EVM addresses. Optional label: { address: "0x..", label: "Main" }
 *
 *  PASSWORD-LOCKED groups: do NOT put the wallets here. Put them in private/locked-groups.json (box only)
 *  and run   node tools/lock-group.js <id> <password>   -> writes locked/walletCount/enc (ciphertext) below.
 * ==========================================================
 */
window.TRACKER_GROUPS = [
  {
    id: "wetrenches",
    name: "WETRENCHES",
    sprite: "capybara",
    chains: ["worldchain"],
    locked: true,
    walletCount: 7,
    enc: {"v":1,"kdf":"PBKDF2-SHA256","iter":250000,"salt":"awiYr0Tc3DwD987nVmQ46Q==","iv":"Mv/8GqMA9L0i5PXL","ct":"dEtWPgk23nqctB3HgMzNw4R2x8SxxC2DcXh5T56PIFUkuJc2528t3w8EMwFqFuPaSm+xeq8FDoe6N8BcRyYgaa3QudRueWOc9/vqMKsAKFhnUnNgJu1/0OLVHDWzLQjOp1y1ac9TSy9sSz0s1RDQMvbgat6hyuXLiLjyVbhyAxAJRmJF2h5EqEktLt0vt5oL+t6kYP4Gii2NEmZsHxk+sRneBauJG84651cIAFGpXt1P8cbXgZTbjnYQOy+miIMd322Xm7/etQ+1qIfefnpIsVyBjsYC/VcBgUXUtiRp6ugBWcOMOMnUyZVMLYUt0HcWd68urz5swCG3K2APIw58FuF3pNnQBnyeAZpsgeCT+ZUPfEhtXN9YY4q0A9UNUph1eRcSDn2WcliAY8q6+KwUYa4B518TxyF3wBL18ukL2/VNiJA6uzhV/6xhWRVAu+jxF7XE13o9nld5m8/LPOP4VpY3oMwTFgybXwD8awY+344="}
  },
  {
    id: "vondraken",
    name: "VONDRAKEN",
    sprite: "dragon",
    chains: ["worldchain"],
    wallets: [
      "0x2635Cd0Fd22926874cE5889E921aA6348D7bf0d3"
    ]
  },
  {
    id: "travi",
    name: "TRAVI",
    sprite: "panda",
    chains: ["worldchain"],
    wallets: [
      "0x4Ce8f3acF303913155A5956a66A23eF24941dd6D"
    ]
  },
  {
    id: "zeldris",
    name: "ZELDRIS",
    sprite: "hedgehog",
    chains: ["worldchain"],
    wallets: [
      "0x1b30f0a3e7fb54211ab31741a2dc58725157b039"
    ]
  },
  {
    id: "ochouso",
    name: "OCHOUSO",
    sprite: "octopus",
    chains: ["worldchain"],
    wallets: [
      "0x917386b684C9306E818Fcb13A681BA6ae46c2787"
    ]
  },
  {
    id: "daso",
    name: "DASO",
    sprite: "horse",
    chains: ["worldchain"],
    wallets: [
      "0x3Bb7C151e1376FF4d3608E01432F8BA686e58Eff"
    ]
  }

  // , {
  //   id: "next-group",
  //   name: "NEXT GROUP",
  //   sprite: "frog",
  //   chains: ["worldchain", "base"],
  //   wallets: ["0x...", { address: "0x...", label: "Dev wallet" }]
  // }
];
