/*
 * ==========================================================
 *  AGENT INUS - WALLET TRACKER  ::  GROUP CONFIG
 * ==========================================================
 *  Add a new group = copy one block below and edit it.
 *
 *  id      : unique, lowercase, letters/numbers/dashes (used for cache keys)
 *  name    : title shown on the card
 *  sprite  : pixel character for the card. One of:
 *            "inu", "dragon", "panda", "cat", "frog", "goblin", "robot", "ghost"
 *  chains  : chains to scan for every wallet in the group. Supported:
 *            "worldchain", "ethereum", "base", "arbitrum", "optimism"
 *            (all served by free public Blockscout explorers - see CHAINS in app.js)
 *  wallets : list of EVM addresses. Optional label: { address: "0x..", label: "Main" }
 * ==========================================================
 */
window.TRACKER_GROUPS = [
  {
    id: "wetrenches",
    name: "WETRENCHES",
    sprite: "inu",
    chains: ["worldchain"],
    wallets: [
      "0xaA0a6FDeB0072D1770eA52e971e6BB7Ce7206a44",
      "0xc14A091B672369D076B03349CD2e588e31f8E8A8",
      "0xED1b2eD74ac13d864853E466754e65f32354F37f",
      "0x580ef5368f1Ab391Db949b2D8B1A1a3bd9421739",
      "0xc0bfB32c8F4616983CC0Eb629DD0265b616882a9",
      "0x982B9f34ccD657cFfBA3A9929f4153C3273BAf88",
      "0xb24189a7c174F5afBd080cAf62c68088d5baa658"
    ]
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
  }

  // , {
  //   id: "next-group",
  //   name: "NEXT GROUP",
  //   sprite: "frog",
  //   chains: ["worldchain", "base"],
  //   wallets: ["0x...", { address: "0x...", label: "Dev wallet" }]
  // }
];
