var config = {
  startAfter: { value: 2, type: "multiplier", label: "first bet after previous payout <" },
  basePayout: { value: 2, type: "multiplier", label: "first bet payout" },
  payoutIncrement: { value: 1, type: "multiplier", label: "after losing, increase (addition) payout by" },
  resetPayout: { value: 5, type: "multiplier", label: "max payout before reset" },
  lossPercentageThreshold: { value: 26, type: "multiplier", label: "don't bet if above this threshold" },
  minBetAmount: { value: 100, type: "balance", label: "bet amount when loss % is above threshold" },
  betAmount: { value: 1000, type: "balance", label: "bet amount when loss % is below threshold" },
};

log("Script has started");

const winLoss = []; // 1 means won; 0 means lost
let currentPayout = config.basePayout.value;
let justReset = false;
let totalSets = 0;
let lostSets = 0;
let pLost = 100;

engine.on("GAME_STARTING", onGameStarted);
if (engine.gameState === "GAME_STARTING" || engine.gameState === "GAME_ENDED") {
  onGameStarted()
  engine.on("GAME_ENDED", onGameEnded);
} else {
  engine.once("GAME_STARTING", () => engine.on("GAME_ENDED", onGameEnded));
}

function onGameStarted() {
  const lastGame = engine.history.first();

  const last20Sets = winLoss.slice(-20);
  const numberOfLossesLast20 = last20Sets.filter(data => data == 0);
  const favorableCondition = (totalSets >= 20 && (numberOfLossesLast20 / 20 < config.lossPercentageThreshold.value))

  const startBet = lastGame.bust < config.startAfter.value;
  const continueBet = lastGame.wager && !lastGame.cashedAt && !justReset;

  if (startBet || continueBet) {
    justReset = false;

    if (favorableCondition) {
      engine.bet(roundBit(config.betAmount.value), currentPayout);
      log("Placed", config.betAmount.value / 100, " bits bet with", currentPayout, "x payout (favorable); Balance:", userInfo.balance / 100);
    } else {
      engine.bet(roundBit(config.minBetAmount.value), currentPayout);
      log("Placed", config.minBetAmount.value / 100, " bits bet with", currentPayout, "x payout (unfavorable); Balance:", userInfo.balance / 100);
    }
  }
}

function onGameEnded() {
  const lastGame = engine.history.first();

  // If we wagered, it means we played
  if (!lastGame.wager) {
    // did not wager, do nothing
    return;
  }

  // we won..
  if (lastGame.cashedAt) {
    winLoss.push(1);
    totalSets += 1;
    pLost = Math.round(lostSets / totalSets * 10000) / 100;
    currentPayout = config.basePayout.value;
    log("[WON] Total Sets: ", totalSets, "; Loss Sets: ", lostSets, "; % Loss: ", pLost, "%; Balance: ", userInfo.balance / 100)
  } else {
    // damn, looks like we lost :(
    currentPayout += config.payoutIncrement.value;
  }

  if (currentPayout > config.resetPayout.value) {
    winLoss.push(0);
    lostSets += 1;
    totalSets += 1;
    pLost = Math.round(lostSets / totalSets * 10000) / 100;
    log("[LOST] Total Sets: ", totalSets, "; Loss Sets: ", lostSets, "; % Loss: ", pLost, "%; Balance: ", userInfo.balance / 100)
    log("Reset max payout. ", currentPayout, "x beyond limit.");
    currentPayout = config.basePayout.value;
    justReset = true;
  }
}

function roundBit(bet) {
  return Math.round(bet / 100) * 100;
}
