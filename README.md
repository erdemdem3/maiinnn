# Sealed Bid Auction PoC with SnarkyJS

Zero-knowledge Sealed Bid Auction with SnarkyJS.

This is a PoC that is meant to demonstrate how a sealed bid auction could be implemented with SnarkzJS. Final implementation would require the bidders to bid privately. But for simplification, they are now all shown on the same webpage. And more investigation and research should be done to further utilize ZK with SnarkyJS.

## Run

Execute:

```sh
npm i
npx tsc && npm run start
```

Then open: http://localhost:3000

## Execution flow

This is how it looks like when it is the first time you open the webpage:

Press `Deploy` to start interacting with the SmartContract

<img src="./screenshots/1.before-deployment.png" width="600"/>

---

Now whitelisted bidders can bid:

<img src="./screenshots/2.after-depoyment.png" width="600"/>

---

It would look like this when some of the bidders had submitted their bids:

<img src="./screenshots/3.bidding.png" width="600"/>

---

This is when all bidders had submitted their bids:

<img src="./screenshots/4.bids-submitted.png" width="600"/>

---

After revealing the auction winner:

<img src="./screenshots/5.auction-finished.png" width="600"/>
