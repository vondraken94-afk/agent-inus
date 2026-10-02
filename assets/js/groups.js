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
 *            "hedgehog", "octopus", "horse", "capybara", "shenron"
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
    walletCount: 8,
    enc: {"v":1,"kdf":"PBKDF2-SHA256","iter":250000,"salt":"72bUif4AX7sUc+Gfch4Kqw==","iv":"g8TuOOKfVNodf9Lu","ct":"u5+HrWP+JLJhD98hCMS2O/o8+ELZyuOZA6+WBbD4/n6z6PQjXLpLNl4Vj++0O7eEiSXcoN5QjcS9cqQKbCfk8KAgHizmZelNyJNiTL6zUUQh0Gr/kLExV2cS5bwk3WvutldzwRqSsfSNjdU8aw/CVScY2gMLHlAwyCuD7q53lkc0JsqZrHma505jPtpWxgyPd7G0HZekK4bK3CNZ2wPDkrYxPZxwYfh8VOtcTYdIWBgMkdpa9ipub+utrOyYi8efSS2XrDh7IjjrschfexYjuhEwhy4M5SDrW5PTopeDEIli44B5Flhsht8bsPFG8Z2VQ3sC0CRgXqx17mKbeIYUlu+nOR5LL12RpIbsAzo19PtJmUqQIXpRghLL0NkHIZ4jJRL0OgsfRFlCcH7nPMvvjRKqsBjPbyDy1vApqzUEdthI3MGXbZiy3PCXDLHkjsvHtsHR8/uDZCgSUjDAUjAphTR5Gd23qb+2hn85mV2iS+d3gy9zoM/FSyv1OdKADPEbiA4CkNjpXklfnoZlCRQaRsr88cT1HCojeG3ppJo="}
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
  },
  {
    id: "shenron",
    name: "SHENRON",
    sprite: "shenron",
    chains: ["worldchain"],
    wallets: [
      "0xeeefff8ce2710fa490e0fcb794235e873c252d2e"
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
