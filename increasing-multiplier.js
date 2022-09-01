var config = {
  betAmount: { value: 1000, type: "balance", label: "bet" },
  startBelow: { value: 2, type: "multiplier" },
  basePayout: { value: 2, type: "multiplier" },
  reset: { value: 4, type: "multiplier", label: "reset payout if last payout >" },
  loss: {
    value: "increase",
    type: "radio",
    label: "On Loss",
    options: {
      base: { type: "noop", label: "Return to base multiplier" },
      increase: { value: 1, type: "multiplier", label: "Increase payout by" },
    },
  },
  win: {
    value: "base",
    type: "radio",
    label: "On Win",
    options: {
      base: { type: "noop", label: "Return to base multiplier" },
      increase: { value: 2, type: "multiplier", label: "Increase payout by" },
    },
  },
};

log("Script is running..");

var currentPayout = config.basePayout.value;
var justReset = false;
var totalSets = 0;
var lostSets = 0;
var pLost = 0;

engine.on("GAME_STARTING", onGameStarted);
if (engine.gameState === "GAME_STARTING" || engine.gameState === "GAME_ENDED") {
  onGameStarted()
  engine.on("GAME_ENDED", onGameEnded);
} else {
  engine.once("GAME_STARTING", () => engine.on("GAME_ENDED", onGameEnded));
}

function onGameStarted() {
  var lastGame = engine.history.first();

  if (lastGame.bust < config.startBelow.value || (lastGame.wager && !lastGame.cashedAt && !justReset)) {
    engine.bet(roundBit(config.betAmount.value), currentPayout);
    justReset = false;
    log("Placed", config.betAmount.value / 100, " bits bet with", currentPayout, "x payout");
  }
}

function onGameEnded() {
  var lastGame = engine.history.first();

  // If we wagered, it means we played
  if (!lastGame.wager) {
    return;
  }

  // we won..
  if (lastGame.cashedAt) {
    if (config.win.value === "base") {
      currentPayout = config.basePayout.value;
    } else {
      console.assert(config.win.value === "increase");
      currentPayout += config.win.options.increase.value;
    }
    totalSets += 1;
    pLost = Math.round(lostSets / totalSets * 10000) / 100;
    log("[WON] Total Sets: ", totalSets, "; Loss Sets: ", lostSets, "; % Loss: ", pLost, "%; Balance: ", userInfo.balance)
    // log("WON, so next bet will be ", currentPayout, "x");
  } else {
    // damn, looks like we lost :(
    if (config.loss.value === "base") {
      currentPayout = config.basePayout.value;
    } else {
      console.assert(config.loss.value === "increase");
      currentPayout += config.loss.options.increase.value;
    }
    // log("LOST, so next bet will be ", currentPayout, "x");
  }

  if (currentPayout > config.reset.value) {
    lostSets += 1;
    totalSets += 1;
    pLost = Math.round(lostSets / totalSets * 10000) / 100;
    log("[LOST] Total Sets: ", totalSets, "; Loss Sets: ", lostSets, "; % Loss: ", pLost, "%; Balance: ", userInfo.balance)
    log("Reset max payout. ", currentPayout, "x beyond limit.");
    currentPayout = config.basePayout.value;
    justReset = true;
  }
}

function roundBit(bet) {
  return Math.round(bet / 100) * 100;
}