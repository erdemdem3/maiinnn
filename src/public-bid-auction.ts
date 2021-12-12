// This file is a sample public auction that is not sealed.
//  The code written here just for domonestration. And it is not been used in any other file in this project.
//  In the implementation here everyone can see who is bidding and what is the amount because the variables are saved onchain.

import {
  Field,
  PublicKey,
  SmartContract,
  state,
  State,
  method,
  UInt64,
  Mina,
  Party,
  Circuit,
  Bool,
  shutdown,
} from 'snarkyjs';

const ParCost = 1000;

function containsPublicKey(xs: Array<PublicKey>, x: PublicKey): Bool {
  return new Bool(xs.some((pub) => pub.equals(x).toBoolean()));
}

// This implements a public auction (Just a reference code that is not used anywhere in this project)
class PublicBidAuction extends SmartContract {
  @state(Field) winnerX: State<Field>;
  @state(Field) winnerY: State<Field>;
  @state(Field) lowestBid: State<Field>;

  // This is not a state variable but a contract parameter
  biddersWhitelist: Array<PublicKey>;

  static get ParticipationCost(): UInt64 {
    return UInt64.fromNumber(ParCost);
  }

  constructor(
    initialBalance: UInt64,
    address: PublicKey,
    owners: Array<PublicKey>,
    minimumBidThreshold: number
  ) {
    super(address);
    this.biddersWhitelist = owners;
    this.balance.addInPlace(initialBalance);
    this.winnerX = State.init(Field.zero);
    this.winnerY = State.init(Field.zero);
    this.lowestBid = State.init(new Field(minimumBidThreshold));
  }

  // requires a bid from one of the keys in the list
  @method async bid(amount: Field) {
    if (!Mina.currentTransaction?.sender.toPublicKey()) {
      throw new Error('Not able to get Mina.currentTransaction');
    }

    // Check that the bidder is in the whitelist
    const isWhiteListed = containsPublicKey(
      this.biddersWhitelist,
      Mina.currentTransaction?.sender.toPublicKey()
    );

    // equivalent to: `isWhiteListed.assertEquals(true);`
    if (!isWhiteListed.toBoolean()) {
      throw new Error('Only whitelisted can bid');
    } else {
      console.log('Recieved a bid', amount.toString());
    }

    const lowestBid = await this.lowestBid.get();
    const publicKey = Mina.currentTransaction?.sender.toPublicKey();
    const winnerX = await this.winnerX.get();
    const winnerY = await this.winnerY.get();
    const assignIfLowestBid = (whenLowest: Field, original: Field) =>
      Circuit.if(lowestBid.gt(amount), whenLowest, original);
    this.lowestBid.set(assignIfLowestBid(amount, lowestBid));
    this.winnerX.set(assignIfLowestBid(publicKey.g.x, winnerX));
    this.winnerY.set(assignIfLowestBid(publicKey.g.y, winnerY));

    // Deduct the Participation Cost from the bidder
    Party.createUnsigned(
      Mina.currentTransaction?.sender.toPublicKey()
    ).balance.subInPlace(PublicBidAuction.ParticipationCost);
    // this.balance.addInPlace(PublicBidAuction.ParticipationCost);
  }
  @method async reveal() {
    if (!Mina.currentTransaction?.sender.toPublicKey()) {
      throw new Error('Not able to get Mina.currentTransaction');
    }

    const publicKey = Mina.currentTransaction?.sender.toPublicKey();
    const winnerX = await this.winnerX.get();
    const winnerY = await this.winnerY.get();
    // Assert the method is called by the winner or the SmartContract owner
    Bool.or(
      Bool.and(publicKey.g.x.equals(winnerX), publicKey.g.y.equals(winnerY)),
      Bool.and(
        publicKey.g.x.equals(this.address.g.x),
        publicKey.g.y.equals(this.address.g.y)
      )
    ).assertEquals(true);

    // // Pay the best bidder to do the work
    // Party.createUnsigned(
    //   Mina.currentTransaction?.sender.toPublicKey()
    // ).balance.addInPlace(this.balance);
  }
}

shutdown();
