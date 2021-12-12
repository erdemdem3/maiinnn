import React, { useCallback, useEffect, useState } from 'react';
import { render } from 'react-dom';
import { isReady } from 'snarkyjs';

// some style params
let grey = '#cccccc';
let darkGrey = '#999999';
let lightGrey = '#f6f6f6';
let thick = 'black solid 4px';
let thin = `${grey} solid 1px`;
let rightColumnWidth = 400;

let SealedBidAuction; // this will hold the dynamically imported './sealed-bid-auction-snapp.ts'

render(<App />, document.querySelector('#root'));

function App() {
  let [biddersAndBids, setBiddersAndBids] = useState([]);
  let [bidThreshold, setBidThreshold] = useState(1000000);
  let [participationCost, setParticipationCost] = useState(10);

  let [view, setView] = useState(1);
  let goForward = () => setView(2);
  let goBack = () => setView(1);

  useEffect(
    () => {
      (async () => {
        await isReady;
        SealedBidAuction = await import('../dist/sealed-bid-auction-snapp.js');
        const bidders = await SealedBidAuction.generateDummyBidders()
        biddersAndBids = bidders.map((bidder) => { return { bidder, bid: 0} })
        setBiddersAndBids(biddersAndBids)
        console.log(biddersAndBids)
      })()
  }
  , []);

  return (
    <Container>
      {view === 1 ? (
        <SnappDeployment {...{
          biddersAndBids, 
          setBiddersAndBids,
          bidThreshold, 
          setBidThreshold,
          participationCost, 
          setParticipationCost,
          goForward }} />
      ) : (
        <SnappInteraction {...{ 
          biddersAndBids, 
          setBiddersAndBids,
          bidThreshold, 
          participationCost, 
          goBack }} />
      )}
    </Container>
  );
}

function SnappDeployment({
  biddersAndBids,
  setBiddersAndBids,
  bidThreshold, 
  setBidThreshold,
  participationCost, 
  setParticipationCost,
  goForward,
}) {

  if( !biddersAndBids || biddersAndBids.length === 0) {
    return 'Initializing...'
  }

  let [isLoading, setLoading] = useState(false);

  async function deploy() {
    if (isLoading) return;
    setLoading(true);
    await isReady;
    const biddersPublicKeys = biddersAndBids.map((b) => b.bidder.publicKey);

    SealedBidAuction = await import('../dist/sealed-bid-auction-snapp.js');
    
    await SealedBidAuction.deploy(
      biddersPublicKeys, 
      participationCost, 
      bidThreshold);
    setLoading(false);
    goForward();
  }

  return (
    <Layout>
      <Header>Create a 'Sealed Bids Auction' Tender</Header>

      <BiddersTable 
        biddersAndBids={biddersAndBids}
        setUpdatedBiddersAndBids={setBiddersAndBids}
      />

      <div style={{ width: rightColumnWidth + 'px' }}>
        <div>
          Bids' Threshold
          <input
              type="text"
              value={bidThreshold}
              style={{
                margin: '10px',
                paddingTop: '10px',
                paddingBottom: '10px',
                width: '100px',
                textAlign: 'center',
                backgroundColor: lightGrey,
                border: thin,
                borderColor: 'darkgreen',
              }}
              onChange={(e) => {
                const num = Number(e.target.value);
                if (Number.isNaN(num)) {setIsAuctionRevealed
                  e.target.value = '';
                  return;
                }
                setBidThreshold(num);
              }}
            ></input>
        </div>
        <div>
          Participation Cost
          <input
              type="text"
              value={participationCost}
              style={{
                margin: '10px',
                paddingTop: '10px',
                paddingBottom: '10px',
                width: '100px',
                textAlign: 'center',
                backgroundColor: lightGrey,
                border: thin,
                borderColor: 'darkgreen',
              }}
              onChange={(e) => {
                const num = Number(e.target.value);
                if (Number.isNaN(num)) {
                  e.target.value = '';
                  return;
                }
                setParticipationCost(num);
              }}
            ></input>
        </div>
        <Button onClick={deploy} disabled={isLoading}>
          Deploy
        </Button>
      </div>
    </Layout>
  );
}

function SnappInteraction({ 
  biddersAndBids, 
  setBiddersAndBids,
  bidThreshold,
  participationCost,
  goBack 
}) {
  let [solution, setUpdatedBiddersAndBids] = useState(biddersAndBids ?? []);
  let [snappState, pullSnappState] = useSnappState(biddersAndBids);

  let [isLoading, setLoading] = useState(false);
  let [isAuctionRevealed, setIsAuctionRevealed] = useState(false);

  async function submit() {
    if (isLoading) return;
    setLoading(true);
    await pullSnappState();
    setLoading(false);

    await SealedBidAuction.updateBiddersBalances(biddersAndBids.map(b => b.bidder))
    biddersAndBids = biddersAndBids.map((elment) => elment)
    setBiddersAndBids(biddersAndBids)
    setIsAuctionRevealed(true);
  }

  return (
    <Layout>
      <Header goBack={goBack}>Whitelisted Bidders can Bid</Header>

      <BiddersTable
        biddersAndBids={biddersAndBids}
        editable={!isAuctionRevealed}
        solution={solution}
        setUpdatedBiddersAndBids={setUpdatedBiddersAndBids}
      />

      <div style={{ width: rightColumnWidth + 'px' }}>
        <div 
          style={{margin: '10px'}}>
          Bids' Threshold: {bidThreshold}
        </div>
        <div
          style={{margin: '10px'}}>
          Participation Cost: {participationCost}
        </div>
        <Button onClick={submit} disabled={isLoading || isAuctionRevealed}>
          Reveal & Pay the Winner
        </Button>
        <Space h="2.5rem" />

        <SnappState state={snappState} />
      </div>
    </Layout>
  );
}

function useSnappState(biddersAndBids) {
  let [state, setState] = useState();
  let pullSnappState = useCallback(async () => {
    let state = await SealedBidAuction?.revealWinner();
    state.winner = biddersAndBids.find((b) => state.winner.equals(b.bidder.publicKey).toBoolean())?.bidder.name;
    setState(state);
    return state;
  });
  return [state, pullSnappState];
}

// pure UI components

function Header({ goBack, children }) {
  return (
    <div style={{ position: 'relative' }}>
      <h1 style={{ fontSize: '36px', textAlign: 'center' }}>{children}</h1>
      {goBack && (
        <div
          onClick={goBack}
          title="Back to step 1"
          style={{
            position: 'absolute',
            cursor: 'pointer',
            left: '25px',
            top: 0,
            fontSize: '40px',
          }}
        >
          👈
        </div>
      )}
    </div>
  );
}

function BiddersTable({ biddersAndBids, editable, setUpdatedBiddersAndBids}) {

  async function submitABid(bidderIndex, amount) {
    if (!editable) return;
    const account = biddersAndBids[bidderIndex].bidder.privateKey;
    await SealedBidAuction.bid(account, amount);

    biddersAndBids[bidderIndex].isBidSubmitted = true;

    await SealedBidAuction.updateBiddersBalances(biddersAndBids.map(b => b.bidder))
    biddersAndBids = biddersAndBids.map((elment) => elment);
    setUpdatedBiddersAndBids(biddersAndBids);

  }
  return (
      <table
        style={{
          borderCollapse: 'collapse',
          width: '485px',
          border: '1px solid black',
        }}
      >
        <thead>
          <tr>
            <th colSpan='4'>
              <h3>
                Sample Whitelist
              </h3>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <h5
                style={{
                  margin: '10px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  display: 'flex',
                }}>
                Name
              </h5>
            </td>
            <td>
              <h5
                style={{
                  margin: '10px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  display: 'flex',
                }}>
                Balance
              </h5>
            </td>
            <td>
            </td>
            <td>
            </td>
          </tr>
          {biddersAndBids.map(({bidder, bid, isBidSubmitted}, i) => (
            <tr key={i} 
              style={{
                height: '100px',
                border: '1px solid black',
              }} 
            >
              <td
                style={{
                  width: '300px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {bidder.name}
                </div>
              </td>
              <td
              >
                <div
                  style={{
                    margin: '10px',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '16px',
                  }}
                >
                  <div>
                  <h5>Initial</h5> {bidder.initialBalance}
                  </div>
                  <div>
                  <h5>Current</h5> {bidder.currentBalance}
                  </div>
                </div>
              </td>
              <td style={{
                  padding: '10px',
                }}>
                <input
                  type="text"
                  disabled={!editable || isBidSubmitted}
                  value={bid == 0 ? '' : bid}
                  style={{
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    width: '100px',
                    textAlign: 'center',
                    backgroundColor: lightGrey,
                    border: thin,
                    borderColor: 'darkgreen',
                  }}
                  onChange={(e) => {
                    bid = Number(e.target.value);
                    if (Number.isNaN(bid)) {
                      e.target.value = '';
                      return;
                    }
                    biddersAndBids[i].bid = bid;
                    const cloned = biddersAndBids.map(item => item);
                    setUpdatedBiddersAndBids(cloned);
                  }}
                ></input>
              </td>
              <td style={{
                  padding: '10px',
                }}>
                <Button
                  onClick={() => submitABid(i, bid)} 
                  disabled={!editable || isBidSubmitted}
                >
                  Bid
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
  );
}

function SnappState({ state = {} }) {
  const { lowestBid, winner } = state;
  return (
    !lowestBid && <></> || <div
      style={{
        backgroundColor: lightGrey,
        border: thin,
        padding: '8px',
      }}
    >

      <p>Auction finished</p>
      <Space h=".5rem" />
      
      <pre style={{ display: 'flex', justifyContent: 'space-between' }}>
        <b>Lowest Bid</b>
        <span
          title='Lowest Bid'
          style={{
            width: '100px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {lowestBid?.toString()}
        </span>
      </pre>
      <Space h=".5rem" />
      <pre style={{ display: 'flex', justifyContent: 'space-between' }}>
        <b>Winner</b>
        <span style={{ color: 'green'}}>
          {winner?.toString()}
        </span>
      </pre>
    </div>
  );
}

function Button({ disabled = false, ...props }) {
  return (
    <button
      className="highlight"
      style={{
        color: disabled ? darkGrey : 'black',
        fontSize: '1rem',
        fontWeight: 'bold',
        backgroundColor: disabled ? 'white !important' : 'white',
        borderRadius: '10px',
        paddingTop: '10px',
        paddingBottom: '10px',
        width: '100%',
        border: disabled ? `4px ${darkGrey} solid` : '4px darkgreen solid',
        boxShadow: `${grey} 3px 3px 3px`,
        cursor: disabled ? undefined : 'pointer',
      }}
      disabled={disabled}
      {...props}
    />
  );
}

function Container(props) {
  return (
    <div
      style={{
        maxWidth: '900px',
        margin: 'auto',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'center',
      }}
      {...props}
    />
  );
}

function Layout({ children }) {
  let [header, left, right] = children;
  return (
    <>
      {header}
      <Space h="4rem" />
      <div style={{ display: 'flex' }}>
        {left}
        <Space w="4rem" />
        {right}
      </div>
    </>
  );
}

function Space({ w, h }) {
  return <div style={{ width: w, height: h }} />;
}
